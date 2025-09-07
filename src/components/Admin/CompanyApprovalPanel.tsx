import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Building2, Phone, Mail, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Company {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  commercial_reg_no: string;
  tax_id: string;
  license_no: string;
  environmental_approval_no: string;
  operating_license_no: string;
  facility_reg_no: string;
  registered_activity: string;
  status: string;
  created_at: string;
  contact_person: string;
}

const CompanyApprovalPanel: React.FC = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingCompanies();
  }, []);

  const fetchPendingCompanies = async () => {
    try {
      setLoading(true);
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('list-pending-companies');
        if (edgeError) throw edgeError;
        const list = (edgeData as any)?.data ?? [];
        setCompanies(list);
      } catch (edgeErr) {
        console.warn('Edge list failed, falling back to RLS-select:', edgeErr);
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .in('status', ['pending', 'under_review'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        setCompanies(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: `فشل في تحميل قائمة الشركات: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (companyId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(companyId);
      
      const status = action === 'approve' ? 'approved' : 'rejected';
      const { error } = await supabase
        .from('companies')
        .update({ 
          status,
          is_active: action === 'approve',
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (error) throw error;

      // إرسال إشعار
      const company = companies.find(c => c.id === companyId);
      if (company) {
        await supabase
          .from('notifications')
          .insert({
            title: action === 'approve' ? 'تم قبول طلب التسجيل' : 'تم رفض طلب التسجيل',
            message: `تم ${action === 'approve' ? 'قبول' : 'رفض'} طلب تسجيل شركة ${company.name}`,
            type: action === 'approve' ? 'approval' : 'rejection',
            data: { company_id: companyId, company_name: company.name }
          });
      }

      toast({
        title: action === 'approve' ? "تم قبول الشركة" : "تم رفض الشركة",
        description: `تم ${action === 'approve' ? 'قبول' : 'رفض'} طلب تسجيل الشركة بنجاح`,
      });

      // تحديث القائمة
      await fetchPendingCompanies();
    } catch (error: any) {
      console.error('Error updating company status:', error);
      toast({
        title: "خطأ في العملية",
        description: `فشل في تحديث حالة الشركة: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">مقبولة</Badge>;
      case 'rejected':
        return <Badge variant="destructive">مرفوضة</Badge>;
      case 'under_review':
        return <Badge variant="secondary">قيد المراجعة</Badge>;
      default:
        return <Badge variant="outline">في انتظار الموافقة</Badge>;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'generator':
        return 'الجهة المولدة للمخلفات';
      case 'transporter':
        return 'الجهة الناقلة للمخلفات';
      case 'recycler':
        return 'جهة تدوير المخلفات';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Building2 className="h-5 w-5" />
            <span>طلبات الموافقة على الشركات</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">جاري تحميل البيانات...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Building2 className="h-5 w-5" />
            <span>طلبات الموافقة على الشركات</span>
          </CardTitle>
          <CardDescription>
            مراجعة والموافقة على طلبات تسجيل الشركات الجديدة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                لا توجد طلبات معلقة للموافقة
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <Card key={company.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <Building2 className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{company.name}</CardTitle>
                          <CardDescription>{getTypeText(company.type)}</CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(company.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{company.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{company.phone}</span>
                      </div>
                      {company.contact_person && (
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">المسؤول: {company.contact_person}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                      {company.commercial_reg_no && (
                        <div>السجل التجاري: {company.commercial_reg_no}</div>
                      )}
                      {company.tax_id && (
                        <div>البطاقة الضريبية: {company.tax_id}</div>
                      )}
                      {company.license_no && (
                        <div>رقم الترخيص: {company.license_no}</div>
                      )}
                      {company.environmental_approval_no && (
                        <div>الموافقة البيئية: {company.environmental_approval_no}</div>
                      )}
                      {company.operating_license_no && (
                        <div>رخصة جهاز تنظيم إدارة المخلفات: {company.operating_license_no}</div>
                      )}
                      {company.facility_reg_no && (
                        <div>تسجيل المنشأة: {company.facility_reg_no}</div>
                      )}
                    </div>

                    {company.address && (
                      <div className="text-sm text-muted-foreground mb-4">
                        العنوان: {company.address}
                      </div>
                    )}

                    {company.registered_activity && (
                      <div className="text-sm text-muted-foreground mb-4">
                        النشاط المسجل: {company.registered_activity}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground mb-4">
                      تاريخ التقديم: {new Date(company.created_at).toLocaleDateString('ar-EG')}
                    </div>

                    {(!company.status || company.status === 'pending' || company.status === 'under_review') && (
                      <div className="flex space-x-3 space-x-reverse">
                        <Button
                          onClick={() => handleApproval(company.id, 'approve')}
                          disabled={processingId === company.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 ml-2" />
                          قبول
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleApproval(company.id, 'reject')}
                          disabled={processingId === company.id}
                        >
                          <XCircle className="h-4 w-4 ml-2" />
                          رفض
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyApprovalPanel;