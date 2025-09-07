import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Upload, Building, FileText, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface CompanyData {
  name: string;
  type: 'generator' | 'transporter' | 'recycler';
  phone: string;
  fax?: string;
  address: string;
  tax_id?: string;
  commercial_reg_no?: string;
  license_no?: string;
  environmental_approval_no?: string;
  operating_license_no?: string;
  facility_reg_no?: string;
  registered_activity?: string;
}

const PDFCompanyImporter: React.FC = () => {
  interface PDFCompanyData {
    name: string;
    address: string;
    phone: string;
    fax?: string;
    tax_id?: string;
    commercial_reg_no?: string;
    environmental_approval_no?: string;
    license_no?: string;
    operating_license_no?: string;
    facility_reg_no?: string;
    registered_activity?: string;
  }

  const [pdfData, setPdfData] = useState<{
    generator: PDFCompanyData;
    transporter: PDFCompanyData;
    recycler: PDFCompanyData;
  }>({
    // الجهة المولدة للمخلفات
    generator: {
      name: 'فيرونيري ايس كريم مصر',
      address: 'المنطقة الصناعية الأولي قطعة رقم 5 السادس من اكتوبر',
      phone: '20226146400',
      fax: '2026133210',
      tax_id: '528530755',
      commercial_reg_no: ''
    },
    // الجهة الناقلة للمخلفات
    transporter: {
      name: 'التوحيد لتجارة مخلفات الأخشاب',
      address: 'المنطقة الصناعية السادسة - ق 53_6 اكتوبر - الجيزة',
      phone: '20238295280',
      fax: '20238295281',
      tax_id: '',
      commercial_reg_no: '',
      environmental_approval_no: '2021-9-20-2881',
      license_no: '1220180527000004',
      registered_activity: 'جمع ونقل المخلفات الغير خطرة واعادة تدوير الاخشاب'
    },
    // جهة تدوير المخلفات
    recycler: {
      name: 'التوحيد لتجارة مخلفات الأخشاب',
      address: 'المنطقة الصناعية السادسة - 53 - 6 اكتوبر',
      phone: '20238295280',
      fax: '20238295281',
      tax_id: '435165205',
      commercial_reg_no: '',
      environmental_approval_no: '2021_9_20_2881',
      operating_license_no: '122018052700004/2018',
      facility_reg_no: '26075',
      registered_activity: 'صناعة الأوعية الخشبية'
    }
  });

  const [editingCompany, setEditingCompany] = useState<'generator' | 'transporter' | 'recycler' | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();

  const updateCompanyData = (
    companyType: 'generator' | 'transporter' | 'recycler',
    field: string,
    value: string
  ) => {
    setPdfData(prev => ({
      ...prev,
      [companyType]: {
        ...prev[companyType],
        [field]: value
      }
    }));
  };

  const createCompany = async (companyType: 'generator' | 'transporter' | 'recycler') => {
    const data = pdfData[companyType];
    
    const action = async () => {
      const companyData: CompanyData = {
        name: data.name,
        type: companyType,
        phone: data.phone,
        fax: data.fax || null,
        address: data.address,
        tax_id: data.tax_id || null,
        commercial_reg_no: data.commercial_reg_no || null,
        license_no: data.license_no || null,
        environmental_approval_no: data.environmental_approval_no || null,
        operating_license_no: data.operating_license_no || null,
        facility_reg_no: data.facility_reg_no || null,
        registered_activity: data.registered_activity || null
      };

      const { data: result, error } = await supabase
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (error) throw error;
      return result;
    };

    await validateAndExecute(
      `create_${companyType}_company`,
      action,
      `تم إنشاء شركة ${getCompanyTypeLabel(companyType)} بنجاح`
    );
  };

  const createAllCompanies = async () => {
    setLoading(true);
    try {
      await createCompany('generator');
      await createCompany('transporter');
      await createCompany('recycler');
      
      toast({
        title: "نجح العملية",
        description: "تم إنشاء جميع الشركات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء بعض الشركات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompanyTypeLabel = (type: 'generator' | 'transporter' | 'recycler') => {
    const labels = {
      generator: 'المولدة للمخلفات',
      transporter: 'الناقلة للمخلفات',
      recycler: 'تدوير المخلفات'
    };
    return labels[type];
  };

  const renderCompanyForm = (companyType: 'generator' | 'transporter' | 'recycler') => {
    const data = pdfData[companyType];
    
    return (
      <Card key={companyType}>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center justify-between">
            <div className="flex items-center">
              <Building className="h-5 w-5 ml-2" />
              الجهة {getCompanyTypeLabel(companyType)}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingCompany(editingCompany === companyType ? null : companyType)}
              >
                {editingCompany === companyType ? 'إخفاء التفاصيل' : 'تعديل البيانات'}
              </Button>
              <Button
                size="sm"
                onClick={() => createCompany(companyType)}
                disabled={loading}
              >
                <Plus className="h-4 w-4 ml-2" />
                إنشاء الشركة
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        {editingCompany === companyType && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم الشركة</Label>
                <Input
                  value={data.name}
                  onChange={(e) => updateCompanyData(companyType, 'name', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>الهاتف</Label>
                <Input
                  value={data.phone}
                  onChange={(e) => updateCompanyData(companyType, 'phone', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>الفاكس</Label>
                <Input
                  value={data.fax || ''}
                  onChange={(e) => updateCompanyData(companyType, 'fax', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>البطاقة الضريبية</Label>
                <Input
                  value={data.tax_id || ''}
                  onChange={(e) => updateCompanyData(companyType, 'tax_id', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>السجل التجاري</Label>
                <Input
                  value={data.commercial_reg_no || ''}
                  onChange={(e) => updateCompanyData(companyType, 'commercial_reg_no', e.target.value)}
                />
              </div>
              
              {companyType !== 'generator' && (
                <>
                  <div className="space-y-2">
                    <Label>رقم الترخيص</Label>
                    <Input
                      value={data.license_no || ''}
                      onChange={(e) => updateCompanyData(companyType, 'license_no', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>رقم الموافقة البيئية</Label>
                    <Input
                      value={data.environmental_approval_no || ''}
                      onChange={(e) => updateCompanyData(companyType, 'environmental_approval_no', e.target.value)}
                    />
                  </div>
                </>
              )}
              
              {companyType === 'recycler' && (
                <>
                  <div className="space-y-2">
                    <Label>رقم رخصة جهاز تنظيم إدارة المخلفات</Label>
                    <Input
                      value={data.operating_license_no || ''}
                      onChange={(e) => updateCompanyData(companyType, 'operating_license_no', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>رقم تسجيل المنشأة</Label>
                    <Input
                      value={data.facility_reg_no || ''}
                      onChange={(e) => updateCompanyData(companyType, 'facility_reg_no', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Textarea
                value={data.address}
                onChange={(e) => updateCompanyData(companyType, 'address', e.target.value)}
                rows={2}
              />
            </div>
            
            {(companyType === 'transporter' || companyType === 'recycler') && (
              <div className="space-y-2">
                <Label>النشاط المسجل</Label>
                <Textarea
                  value={data.registered_activity || ''}
                  onChange={(e) => updateCompanyData(companyType, 'registered_activity', e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        )}
        
        {editingCompany !== companyType && (
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>الاسم:</strong> {data.name}</p>
              <p><strong>الهاتف:</strong> {data.phone}</p>
              <p><strong>العنوان:</strong> {data.address}</p>
              {data.tax_id && <p><strong>البطاقة الضريبية:</strong> {data.tax_id}</p>}
              {data.license_no && <p><strong>رقم الترخيص:</strong> {data.license_no}</p>}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center">
            <FileText className="h-5 w-5 ml-2" />
            استيراد بيانات الشركات من PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              تم استخراج بيانات الشركات التالية من المستند المرفق:
            </p>
            
            <div className="flex justify-center gap-4">
              <Button onClick={createAllCompanies} disabled={loading} size="lg">
                <Plus className="h-5 w-5 ml-2" />
                إنشاء جميع الشركات
              </Button>
            </div>
            
            <Separator />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {renderCompanyForm('generator')}
        {renderCompanyForm('transporter')}
        {renderCompanyForm('recycler')}
      </div>
    </div>
  );
};

export default PDFCompanyImporter;