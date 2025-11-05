import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileText, ArrowLeft, Search, Download, Eye, Building2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TermsAcceptance {
  id: string;
  company_name: string;
  company_type: string;
  full_name: string;
  accepted_at: string;
  terms_version: string;
  signature_data: string | null;
  company_stamp_data: string | null;
  terms_content: string;
  company_id: string;
}

interface CompanySignature {
  id: string;
  company_id: string;
  signature_image_url: string | null;
  stamp_image_url: string | null;
  signature_uploaded_at: string | null;
  stamp_uploaded_at: string | null;
}

const CompanyDocuments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [acceptances, setAcceptances] = useState<TermsAcceptance[]>([]);
  const [signatures, setSignatures] = useState<CompanySignature[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<TermsAcceptance | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDocuments();
    } else {
      navigate('/');
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Fetch terms acceptances
      const { data: acceptancesData, error: acceptancesError } = await supabase
        .from('terms_acceptance')
        .select('*')
        .order('accepted_at', { ascending: false });

      if (acceptancesError) throw acceptancesError;

      // Fetch company signatures
      const { data: signaturesData, error: signaturesError } = await supabase
        .from('company_signatures')
        .select('*')
        .order('created_at', { ascending: false });

      if (signaturesError) throw signaturesError;

      setAcceptances(acceptancesData || []);
      setSignatures(signaturesData || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        title: "خطأ في التحميل",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAcceptances = acceptances.filter(acc =>
    acc.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.company_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCompanyTypeLabel = (type: string) => {
    switch (type) {
      case 'generator':
        return 'مولد';
      case 'transporter':
        return 'ناقل';
      case 'recycler':
        return 'مُدوّر';
      default:
        return type;
    }
  };

  const downloadDocument = (acceptance: TermsAcceptance) => {
    const companySignature = signatures.find(s => s.company_id === acceptance.company_id);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>مستند الموافقة على الشروط والأحكام - ${acceptance.company_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Cairo', sans-serif;
            padding: 40px;
            line-height: 1.8;
            background: #f9fafb;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .header {
            text-align: center;
            background: linear-gradient(135deg, #006400 0%, #228B22 100%);
            color: white;
            padding: 30px;
          }
          
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 700;
          }
          
          .header p {
            font-size: 18px;
            opacity: 0.95;
          }
          
          .content {
            padding: 40px;
          }
          
          .info-section {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-right: 4px solid #006400;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .info-row:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }
          
          .info-label {
            font-weight: 600;
            color: #374151;
          }
          
          .info-value {
            color: #6b7280;
          }
          
          .signature-section {
            margin: 30px 0;
            padding: 25px;
            background: #fefce8;
            border: 2px solid #fbbf24;
            border-radius: 8px;
          }
          
          .signature-section h3 {
            color: #92400e;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
          }
          
          .signature-box {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          
          .signature-box img {
            max-width: 200px;
            max-height: 100px;
            margin: 10px auto;
            display: block;
            border: 1px solid #d1d5db;
            border-radius: 4px;
          }
          
          .signature-label {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 10px;
          }
          
          .terms-section {
            margin-top: 30px;
            padding: 25px;
            background: #f9fafb;
            border-radius: 8px;
          }
          
          .terms-section h3 {
            color: #006400;
            margin-bottom: 20px;
            font-size: 20px;
            border-bottom: 2px solid #006400;
            padding-bottom: 10px;
          }
          
          .terms-content {
            white-space: pre-wrap;
            line-height: 2;
            color: #1f2937;
          }
          
          .footer {
            text-align: center;
            padding: 20px;
            background: #f3f4f6;
            color: #6b7280;
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
          }
          
          @media print {
            body {
              padding: 0;
              background: white;
            }
            
            .container {
              box-shadow: none;
              max-width: 100%;
            }
            
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>مستند الموافقة على الشروط والأحكام</h1>
            <p>نظام تتبع ومراقبة النفايات الصناعية</p>
          </div>
          
          <div class="content">
            <div class="info-section">
              <h3 style="color: #006400; margin-bottom: 15px; font-size: 18px;">معلومات الشركة</h3>
              <div class="info-row">
                <span class="info-label">اسم الشركة:</span>
                <span class="info-value">${acceptance.company_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">نوع الشركة:</span>
                <span class="info-value">${getCompanyTypeLabel(acceptance.company_type)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">الاسم الكامل للموظف المفوض:</span>
                <span class="info-value">${acceptance.full_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">تاريخ القبول:</span>
                <span class="info-value">${new Date(acceptance.accepted_at).toLocaleString('ar-SA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              <div class="info-row">
                <span class="info-label">إصدار الشروط:</span>
                <span class="info-value">${acceptance.terms_version}</span>
              </div>
            </div>
            
            ${acceptance.signature_data || acceptance.company_stamp_data || companySignature?.signature_image_url || companySignature?.stamp_image_url ? `
            <div class="signature-section">
              <h3>التوقيعات والأختام</h3>
              <div class="signature-grid">
                ${acceptance.signature_data || companySignature?.signature_image_url ? `
                <div class="signature-box">
                  <div class="signature-label">توقيع الموظف المفوض</div>
                  <img src="${acceptance.signature_data || companySignature?.signature_image_url}" alt="التوقيع">
                  <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                    ${acceptance.signature_data ? 'توقيع إلكتروني' : 'توقيع الشركة'}
                  </div>
                </div>
                ` : ''}
                
                ${acceptance.company_stamp_data || companySignature?.stamp_image_url ? `
                <div class="signature-box">
                  <div class="signature-label">ختم الشركة</div>
                  <img src="${acceptance.company_stamp_data || companySignature?.stamp_image_url}" alt="الختم">
                  <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                    ${acceptance.company_stamp_data ? 'ختم إلكتروني' : 'ختم الشركة الرسمي'}
                  </div>
                </div>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            <div class="terms-section">
              <h3>الشروط والأحكام المقبولة</h3>
              <div class="terms-content">${acceptance.terms_content}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>هذا المستند تم إنشاؤه تلقائياً من نظام تتبع ومراقبة النفايات الصناعية</p>
            <p style="margin-top: 5px;">تاريخ الطباعة: ${new Date().toLocaleString('ar-SA')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `مستند-${acceptance.company_name.replace(/\s+/g, '-')}-${acceptance.id.slice(0, 8)}.html`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "تم التحميل بنجاح",
      description: "تم تحميل المستند على جهازك",
    });
  };

  const printDocument = (acceptance: TermsAcceptance) => {
    const companySignature = signatures.find(s => s.company_id === acceptance.company_id);
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: "خطأ في الطباعة",
        description: "يرجى السماح بفتح النوافذ المنبثقة",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>طباعة - ${acceptance.company_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          body { font-family: 'Cairo', sans-serif; padding: 20px; line-height: 1.8; }
          .header { text-align: center; border-bottom: 3px solid #006400; padding-bottom: 20px; margin-bottom: 30px; }
          .info-row { margin: 10px 0; padding: 8px; background: #f9fafb; }
          .signature-section { margin: 30px 0; padding: 20px; border: 2px solid #fbbf24; }
          .signature-section img { max-width: 200px; max-height: 100px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>مستند الموافقة على الشروط والأحكام</h1>
          <p>${acceptance.company_name}</p>
        </div>
        <div class="info-row"><strong>نوع الشركة:</strong> ${getCompanyTypeLabel(acceptance.company_type)}</div>
        <div class="info-row"><strong>الموظف المفوض:</strong> ${acceptance.full_name}</div>
        <div class="info-row"><strong>التاريخ:</strong> ${new Date(acceptance.accepted_at).toLocaleString('ar-SA')}</div>
        ${acceptance.signature_data || companySignature?.signature_image_url ? `
        <div class="signature-section">
          <h3>التوقيع</h3>
          <img src="${acceptance.signature_data || companySignature?.signature_image_url}" alt="التوقيع">
        </div>
        ` : ''}
        ${acceptance.company_stamp_data || companySignature?.stamp_image_url ? `
        <div class="signature-section">
          <h3>ختم الشركة</h3>
          <img src="${acceptance.company_stamp_data || companySignature?.stamp_image_url}" alt="الختم">
        </div>
        ` : ''}
        <div style="margin-top: 30px; white-space: pre-wrap;">
          <h3>الشروط والأحكام:</h3>
          ${acceptance.terms_content}
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-cairo">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-cairo">مستندات الشركات</h1>
            <p className="text-muted-foreground font-cairo">
              عرض وطباعة مستندات الشروط والأحكام والتوقيعات
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)} className="font-cairo">
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-cairo flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  جميع المستندات
                </CardTitle>
                <CardDescription className="font-cairo">
                  {filteredAcceptances.length} مستند من أصل {acceptances.length}
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في المستندات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 font-cairo"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right font-cairo">الشركة</TableHead>
                  <TableHead className="text-right font-cairo">النوع</TableHead>
                  <TableHead className="text-right font-cairo">الموظف المفوض</TableHead>
                  <TableHead className="text-right font-cairo">التاريخ</TableHead>
                  <TableHead className="text-right font-cairo">الإصدار</TableHead>
                  <TableHead className="text-right font-cairo">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAcceptances.map((acceptance) => (
                  <TableRow key={acceptance.id}>
                    <TableCell className="font-medium font-cairo">{acceptance.company_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-cairo">
                        {getCompanyTypeLabel(acceptance.company_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-cairo">{acceptance.full_name}</TableCell>
                    <TableCell className="font-cairo">
                      {new Date(acceptance.accepted_at).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell className="font-cairo">{acceptance.terms_version}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(acceptance);
                            setShowPreview(true);
                          }}
                          title="معاينة"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => printDocument(acceptance)}
                          title="طباعة"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument(acceptance)}
                          title="تحميل"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredAcceptances.length === 0 && (
              <div className="text-center py-12 text-muted-foreground font-cairo">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد مستندات تطابق البحث</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">معاينة المستند</DialogTitle>
            <DialogDescription className="font-cairo">
              {selectedDocument?.company_name} - {getCompanyTypeLabel(selectedDocument?.company_type || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4 font-cairo">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div><strong>الموظف المفوض:</strong> {selectedDocument.full_name}</div>
                <div><strong>التاريخ:</strong> {new Date(selectedDocument.accepted_at).toLocaleString('ar-SA')}</div>
                <div><strong>الإصدار:</strong> {selectedDocument.terms_version}</div>
              </div>
              
              {(selectedDocument.signature_data || selectedDocument.company_stamp_data) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedDocument.signature_data && (
                    <div className="border p-4 rounded-lg text-center">
                      <p className="font-semibold mb-2">التوقيع</p>
                      <img 
                        src={selectedDocument.signature_data} 
                        alt="التوقيع" 
                        className="max-w-full h-20 mx-auto"
                      />
                    </div>
                  )}
                  {selectedDocument.company_stamp_data && (
                    <div className="border p-4 rounded-lg text-center">
                      <p className="font-semibold mb-2">الختم</p>
                      <img 
                        src={selectedDocument.company_stamp_data} 
                        alt="الختم" 
                        className="max-w-full h-20 mx-auto"
                      />
                    </div>
                  )}
                </div>
              )}
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">الشروط والأحكام:</h4>
                <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-60 overflow-y-auto">
                  {selectedDocument.terms_content}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyDocuments;