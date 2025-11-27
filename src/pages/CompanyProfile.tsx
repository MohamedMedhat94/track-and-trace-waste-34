import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Edit, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CompanyProfile: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    fetchCompanyData();
  }, [profile?.company_id]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile?.company_id)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (error) {
      console.error('خطأ في جلب بيانات الشركة:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الشركة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.role || profile.role === 'driver') {
      toast({
        title: "غير مصرح",
        description: "فقط الإدارة يمكنها تعديل بيانات الشركة",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('companies')
        .update(company)
        .eq('id', profile?.company_id);

      if (error) throw error;

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تحديث بيانات الشركة",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('خطأ في حفظ البيانات:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ بيانات الشركة",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCompanyTypeLabel = (type: string) => {
    switch (type) {
      case 'generator': return 'جهة مولدة';
      case 'transporter': return 'شركة نقل';
      case 'recycler': return 'جهة إعادة تدوير';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground">لم يتم العثور على بيانات الشركة</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              العودة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = profile?.role === 'admin';

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-cairo">بيانات الشركة</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {getCompanyTypeLabel(company.type)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {canEdit && !isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1 sm:flex-none">
                  <Edit className="h-4 w-4 ml-2" />
                  تعديل
                </Button>
              )}
              {isEditing && (
                <>
                  <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
                    <Save className="h-4 w-4 ml-2" />
                    حفظ
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      fetchCompanyData();
                    }}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                  >
                    <X className="h-4 w-4 ml-2" />
                    إلغاء
                  </Button>
                </>
              )}
              <Button onClick={() => navigate(-1)} variant="ghost" className="hidden sm:flex">
                العودة
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Company Data */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">البيانات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الشركة</Label>
              <Input
                value={company.name || ''}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            
            <div className="space-y-2">
              <Label>نوع الجهة</Label>
              <Input
                value={getCompanyTypeLabel(company.type)}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                value={company.email || ''}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                disabled={!isEditing}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={company.phone || ''}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>رقم الفاكس</Label>
              <Input
                value={company.fax || ''}
                onChange={(e) => setCompany({ ...company, fax: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>الرقم الضريبي</Label>
              <Input
                value={company.tax_id || ''}
                onChange={(e) => setCompany({ ...company, tax_id: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>السجل التجاري</Label>
              <Input
                value={company.commercial_reg_no || ''}
                onChange={(e) => setCompany({ ...company, commercial_reg_no: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>رقم الرخصة</Label>
              <Input
                value={company.license_no || ''}
                onChange={(e) => setCompany({ ...company, license_no: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>العنوان</Label>
              <Textarea
                value={company.address || ''}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                disabled={!isEditing}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>رقم تسجيل المنشأة</Label>
              <Input
                value={company.facility_reg_no || ''}
                onChange={(e) => setCompany({ ...company, facility_reg_no: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>النشاط المسجل</Label>
              <Input
                value={company.registered_activity || ''}
                onChange={(e) => setCompany({ ...company, registered_activity: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {company.type === 'transporter' && (
              <>
                <div className="space-y-2">
                  <Label>رقم الموافقة البيئية</Label>
                  <Input
                    value={company.environmental_approval_no || ''}
                    onChange={(e) => setCompany({ ...company, environmental_approval_no: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label>رقم رخصة التشغيل</Label>
                  <Input
                    value={company.operating_license_no || ''}
                    onChange={(e) => setCompany({ ...company, operating_license_no: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>رقم البطاقة الضريبية</Label>
              <Input
                value={company.tax_card_no || ''}
                onChange={(e) => setCompany({ ...company, tax_card_no: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>السجل الصناعي</Label>
              <Input
                value={company.industrial_registry || ''}
                onChange={(e) => setCompany({ ...company, industrial_registry: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>رقم ترخيص جهاز المخلفات</Label>
              <Input
                value={company.waste_license_no || ''}
                onChange={(e) => setCompany({ ...company, waste_license_no: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {company.union_membership_no && (
              <div className="space-y-2">
                <Label>رقم العضوية في الاتحاد</Label>
                <Input
                  value={company.union_membership_no || ''}
                  onChange={(e) => setCompany({ ...company, union_membership_no: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Information */}
      {(company.location_address || company.location_latitude || company.location_longitude) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">معلومات الموقع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-3">
                <Label>عنوان الموقع</Label>
                <Input
                  value={company.location_address || ''}
                  onChange={(e) => setCompany({ ...company, location_address: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label>خط العرض</Label>
                <Input
                  value={company.location_latitude || ''}
                  onChange={(e) => setCompany({ ...company, location_latitude: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label>خط الطول</Label>
                <Input
                  value={company.location_longitude || ''}
                  onChange={(e) => setCompany({ ...company, location_longitude: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              {company.location_latitude && company.location_longitude && (
                <div className="space-y-2">
                  <Label>عرض على الخريطة</Label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${company.location_latitude},${company.location_longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    فتح في خرائط جوجل
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">معلومات إضافية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Input
                value={company.is_active ? 'نشط' : 'غير نشط'}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ التسجيل</Label>
              <Input
                value={new Date(company.created_at).toLocaleDateString('ar-SA')}
                disabled
              />
            </div>

            {company.drivers_count !== undefined && (
              <div className="space-y-2">
                <Label>عدد السائقين</Label>
                <Input
                  value={company.drivers_count}
                  disabled
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!canEdit && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="pt-6">
            <p className="text-sm text-center text-muted-foreground">
              ملاحظة: يمكن لإدارة النظام فقط تعديل بيانات الشركة
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompanyProfile;
