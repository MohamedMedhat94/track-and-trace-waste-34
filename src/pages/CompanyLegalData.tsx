import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Building2, 
  Edit, 
  FileText, 
  Upload, 
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Loader2
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  type: string;
  commercial_reg_no: string | null;
  tax_card_no: string | null;
  industrial_registry: string | null;
  waste_license_no: string | null;
  license_no: string | null;
  operating_license_no: string | null;
  environmental_approval_no: string | null;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  contact_person: string | null;
  status: string | null;
  is_active: boolean | null;
}

interface CompanyDocument {
  name: string;
  id: string;
  created_at: string;
  metadata: any;
}

const CompanyLegalData: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDocumentsDialogOpen, setIsDocumentsDialogOpen] = useState(false);
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    commercial_reg_no: '',
    tax_card_no: '',
    industrial_registry: '',
    waste_license_no: '',
    license_no: '',
    operating_license_no: '',
    environmental_approval_no: '',
    tax_id: '',
    phone: '',
    email: '',
    address: '',
    contact_person: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [companies, searchTerm, typeFilter]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;

      setCompanies(data || []);
    } catch (error: any) {
      console.error('خطأ في جلب الشركات:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الشركات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...companies];

    if (searchTerm) {
      filtered = filtered.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.commercial_reg_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(company => company.type === typeFilter);
    }

    setFilteredCompanies(filtered);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setEditForm({
      commercial_reg_no: company.commercial_reg_no || '',
      tax_card_no: company.tax_card_no || '',
      industrial_registry: company.industrial_registry || '',
      waste_license_no: company.waste_license_no || '',
      license_no: company.license_no || '',
      operating_license_no: company.operating_license_no || '',
      environmental_approval_no: company.environmental_approval_no || '',
      tax_id: company.tax_id || '',
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || '',
      contact_person: company.contact_person || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedCompany) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('companies')
        .update(editForm)
        .eq('id', selectedCompany.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث البيانات القانونية بنجاح",
      });

      setIsEditDialogOpen(false);
      fetchCompanies();
    } catch (error: any) {
      console.error('خطأ في التحديث:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDocuments = async (company: Company) => {
    setSelectedCompany(company);
    setIsDocumentsDialogOpen(true);
    await fetchCompanyDocuments(company.id);
  };

  const fetchCompanyDocuments = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('company-documents')
        .list(`${companyId}`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      setCompanyDocuments(data || []);
    } catch (error: any) {
      console.error('خطأ في جلب المستندات:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل المستندات",
        variant: "destructive",
      });
    }
  };

  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCompany || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${selectedCompany.id}/${fileName}`;

    try {
      setIsUploadingDocument(true);

      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      toast({
        title: "تم الرفع",
        description: "تم رفع المستند بنجاح",
      });

      await fetchCompanyDocuments(selectedCompany.id);
    } catch (error: any) {
      console.error('خطأ في رفع المستند:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في رفع المستند",
        variant: "destructive",
      });
    } finally {
      setIsUploadingDocument(false);
      event.target.value = '';
    }
  };

  const handleDownloadDocument = async (doc: CompanyDocument) => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase.storage
        .from('company-documents')
        .download(`${selectedCompany.id}/${doc.name}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "تم التحميل",
        description: "تم تحميل المستند بنجاح",
      });
    } catch (error: any) {
      console.error('خطأ في تحميل المستند:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل المستند",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (doc: CompanyDocument) => {
    if (!selectedCompany) return;

    if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;

    try {
      const { error } = await supabase.storage
        .from('company-documents')
        .remove([`${selectedCompany.id}/${doc.name}`]);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف المستند بنجاح",
      });

      await fetchCompanyDocuments(selectedCompany.id);
    } catch (error: any) {
      console.error('خطأ في حذف المستند:', error);
      toast({
        title: "خطأ",
        description: "فشل في حذف المستند",
        variant: "destructive",
      });
    }
  };

  const getCompanyTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      generator: 'جهة مولدة',
      transporter: 'جهة ناقلة',
      recycler: 'جهة مدورة'
    };
    return types[type] || type;
  };

  const getCompanyTypeBadge = (type: string) => {
    const colors: { [key: string]: string } = {
      generator: 'bg-blue-100 text-blue-800',
      transporter: 'bg-green-100 text-green-800',
      recycler: 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="font-cairo"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              رجوع
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-cairo">إدارة البيانات القانونية</h1>
              <p className="text-muted-foreground">
                عرض وتحرير البيانات القانونية للشركات والمستندات المرفقة
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search" className="font-cairo">البحث</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="ابحث بالاسم، السجل التجاري، الرقم الضريبي..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="type-filter" className="font-cairo">نوع الشركة</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="جميع الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="generator">جهات مولدة</SelectItem>
                    <SelectItem value="transporter">جهات ناقلة</SelectItem>
                    <SelectItem value="recycler">جهات مدورة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">الشركات ({filteredCompanies.length})</CardTitle>
            <CardDescription>
              قائمة الشركات مع بياناتها القانونية والمستندات المرفقة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد شركات مطابقة للبحث
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-cairo">اسم الشركة</TableHead>
                      <TableHead className="font-cairo">النوع</TableHead>
                      <TableHead className="font-cairo">السجل التجاري</TableHead>
                      <TableHead className="font-cairo">البطاقة الضريبية</TableHead>
                      <TableHead className="font-cairo">السجل الصناعي</TableHead>
                      <TableHead className="font-cairo">الحالة</TableHead>
                      <TableHead className="font-cairo text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{company.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCompanyTypeBadge(company.type)}>
                            {getCompanyTypeText(company.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {company.commercial_reg_no || (
                            <span className="text-muted-foreground text-sm">غير متوفر</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {company.tax_card_no || (
                            <span className="text-muted-foreground text-sm">غير متوفر</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {company.industrial_registry || (
                            <span className="text-muted-foreground text-sm">غير متوفر</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={company.is_active ? "default" : "secondary"}>
                            {company.is_active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-2 space-x-reverse">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCompany(company)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocuments(company)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              تعديل البيانات القانونية - {selectedCompany?.name}
            </DialogTitle>
            <DialogDescription>
              تحديث البيانات القانونية والتواصل للشركة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-cairo">السجل التجاري</Label>
                <Input
                  value={editForm.commercial_reg_no}
                  onChange={(e) => setEditForm({ ...editForm, commercial_reg_no: e.target.value })}
                  placeholder="رقم السجل التجاري"
                />
              </div>
              <div>
                <Label className="font-cairo">البطاقة الضريبية</Label>
                <Input
                  value={editForm.tax_card_no}
                  onChange={(e) => setEditForm({ ...editForm, tax_card_no: e.target.value })}
                  placeholder="رقم البطاقة الضريبية"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-cairo">السجل الصناعي</Label>
                <Input
                  value={editForm.industrial_registry}
                  onChange={(e) => setEditForm({ ...editForm, industrial_registry: e.target.value })}
                  placeholder="رقم السجل الصناعي"
                />
              </div>
              <div>
                <Label className="font-cairo">ترخيص جهاز المخلفات</Label>
                <Input
                  value={editForm.waste_license_no}
                  onChange={(e) => setEditForm({ ...editForm, waste_license_no: e.target.value })}
                  placeholder="رقم ترخيص المخلفات"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-cairo">رخصة التشغيل</Label>
                <Input
                  value={editForm.operating_license_no}
                  onChange={(e) => setEditForm({ ...editForm, operating_license_no: e.target.value })}
                  placeholder="رقم رخصة التشغيل"
                />
              </div>
              <div>
                <Label className="font-cairo">الموافقة البيئية</Label>
                <Input
                  value={editForm.environmental_approval_no}
                  onChange={(e) => setEditForm({ ...editForm, environmental_approval_no: e.target.value })}
                  placeholder="رقم الموافقة البيئية"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-cairo">رقم التعريف الضريبي</Label>
                <Input
                  value={editForm.tax_id}
                  onChange={(e) => setEditForm({ ...editForm, tax_id: e.target.value })}
                  placeholder="الرقم الضريبي"
                />
              </div>
              <div>
                <Label className="font-cairo">رقم الترخيص العام</Label>
                <Input
                  value={editForm.license_no}
                  onChange={(e) => setEditForm({ ...editForm, license_no: e.target.value })}
                  placeholder="رقم الترخيص"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-cairo">رقم الهاتف</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="رقم الهاتف"
                />
              </div>
              <div>
                <Label className="font-cairo">البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="البريد الإلكتروني"
                />
              </div>
            </div>

            <div>
              <Label className="font-cairo">اسم الشخص المسؤول</Label>
              <Input
                value={editForm.contact_person}
                onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                placeholder="اسم الشخص المسؤول"
              />
            </div>

            <div>
              <Label className="font-cairo">العنوان</Label>
              <Textarea
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="العنوان الكامل للشركة"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                إلغاء
              </Button>
              <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ التغييرات'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Documents Dialog */}
      <Dialog open={isDocumentsDialogOpen} onOpenChange={setIsDocumentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              المستندات - {selectedCompany?.name}
            </DialogTitle>
            <DialogDescription>
              عرض وإدارة المستندات القانونية المرفقة للشركة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-cairo text-lg font-semibold">
                المستندات المرفقة ({companyDocuments.length})
              </Label>
              <div>
                <input
                  type="file"
                  id="document-upload"
                  className="hidden"
                  onChange={handleUploadDocument}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  disabled={isUploadingDocument}
                />
                <Button
                  onClick={() => document.getElementById('document-upload')?.click()}
                  disabled={isUploadingDocument}
                >
                  {isUploadingDocument ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الرفع...
                    </>
                  ) : (
                    <>
                      <Upload className="ml-2 h-4 w-4" />
                      رفع مستند
                    </>
                  )}
                </Button>
              </div>
            </div>

            {companyDocuments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد مستندات مرفقة</p>
                <p className="text-sm">قم برفع المستندات القانونية للشركة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {companyDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse flex-1">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyLegalData;
