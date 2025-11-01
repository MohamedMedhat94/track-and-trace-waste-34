import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileSignature, Download, ArrowLeft, Check } from 'lucide-react';

const ViewTermsAcceptance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [acceptance, setAcceptance] = useState<any>(null);

  useEffect(() => {
    fetchAcceptance();
  }, [user]);

  const fetchAcceptance = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('terms_acceptance')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setAcceptance(data);
    } catch (error: any) {
      console.error('Error fetching acceptance:', error);
      toast({
        title: "خطأ في التحميل",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!acceptance) return;

    const pdfContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>الشروط والأحكام الموقعة - ${acceptance.company_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
            padding: 40px;
            line-height: 1.8;
            color: #1a1a1a;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #006400;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            color: #006400;
            font-size: 28px;
            font-weight: 700;
          }
          .content {
            margin: 30px 0;
            white-space: pre-wrap;
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
          }
          .signature-section {
            margin-top: 40px;
            padding: 20px;
            border: 2px solid #006400;
            border-radius: 8px;
          }
          .signature-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 15px 0;
            padding: 10px;
            border-bottom: 1px dashed #ccc;
          }
          .signature-image {
            max-width: 200px;
            max-height: 80px;
            border: 1px solid #ddd;
            padding: 5px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">آي ريسايكل</div>
          <h2>مستند الموافقة على الشروط والأحكام</h2>
        </div>

        <div class="signature-section">
          <h3 style="color: #006400; margin-bottom: 20px;">معلومات الموافقة</h3>
          <div class="signature-row">
            <strong>اسم الشركة:</strong>
            <span>${acceptance.company_name}</span>
          </div>
          <div class="signature-row">
            <strong>الاسم الكامل:</strong>
            <span>${acceptance.full_name}</span>
          </div>
          <div class="signature-row">
            <strong>نوع الجهة:</strong>
            <span>${acceptance.company_type === 'generator' ? 'جهة مولدة' : 
                  acceptance.company_type === 'transporter' ? 'جهة ناقلة' : 'جهة مُدوّرة'}</span>
          </div>
          <div class="signature-row">
            <strong>تاريخ الموافقة:</strong>
            <span>${new Date(acceptance.accepted_at).toLocaleString('ar-SA')}</span>
          </div>
          <div class="signature-row">
            <strong>إصدار الشروط:</strong>
            <span>${acceptance.terms_version}</span>
          </div>
          ${acceptance.signature_data ? `
          <div style="margin-top: 20px; text-align: center;">
            <strong>التوقيع الإلكتروني:</strong><br>
            <img src="${acceptance.signature_data}" class="signature-image" alt="التوقيع" style="display: inline-block; margin-top: 10px;">
          </div>
          ` : ''}
        </div>

        <div class="content">
          <h3 style="color: #006400; margin-bottom: 15px;">نص الشروط والأحكام</h3>
          ${acceptance.terms_content}
        </div>

        <div class="footer">
          <p>هذا المستند تم إنشاؤه تلقائياً من نظام آي ريسايكل</p>
          <p>تاريخ الإنشاء: ${new Date().toLocaleString('ar-SA')}</p>
          <p>المرجع: ${acceptance.id}</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `شروط-وأحكام-${acceptance.company_name}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "تم التحميل",
      description: "تم تحميل مستند الموافقة بنجاح",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!acceptance) {
    return (
      <div className="min-h-screen bg-muted/20 p-4">
        <div className="max-w-4xl mx-auto space-y-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo">لم يتم العثور على موافقة</CardTitle>
              <CardDescription>
                لم تقم بالموافقة على الشروط والأحكام بعد
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/terms-and-conditions')}>
                الموافقة على الشروط
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-cairo">مستند الموافقة على الشروط</h1>
            <p className="text-muted-foreground">
              نسخة من موافقتك على شروط وأحكام استخدام المنصة
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة
          </Button>
        </div>

        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center ml-3">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="font-cairo">تم قبول الشروط</CardTitle>
                  <CardDescription className="text-green-700">
                    تم حفظ موافقتك بنجاح في السجلات
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-green-600">موثق</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Acceptance Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">اسم الشركة</p>
                <p className="font-semibold">{acceptance.company_name}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">الاسم الكامل</p>
                <p className="font-semibold">{acceptance.full_name}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">نوع الجهة</p>
                <p className="font-semibold">
                  {acceptance.company_type === 'generator' ? 'جهة مولدة' :
                   acceptance.company_type === 'transporter' ? 'جهة ناقلة' : 'جهة مُدوّرة'}
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">تاريخ الموافقة</p>
                <p className="font-semibold">
                  {new Date(acceptance.accepted_at).toLocaleString('ar-SA')}
                </p>
              </div>
            </div>

            {/* Signature */}
            {acceptance.signature_data && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center">
                  <FileSignature className="h-4 w-4 ml-2" />
                  التوقيع الإلكتروني
                </h4>
                <div className="bg-white p-4 rounded border inline-block">
                  <img 
                    src={acceptance.signature_data} 
                    alt="التوقيع" 
                    className="max-h-24"
                  />
                </div>
              </div>
            )}

            {/* Terms Content */}
            <div>
              <h4 className="font-semibold mb-3">نص الشروط والأحكام المقبولة</h4>
              <ScrollArea className="h-96 w-full rounded-lg border bg-muted/50 p-6">
                <div className="whitespace-pre-wrap font-cairo text-sm leading-relaxed">
                  {acceptance.terms_content}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex justify-center pt-4 border-t">
              <Button onClick={downloadPDF}>
                <Download className="h-4 w-4 ml-2" />
                تحميل المستند
              </Button>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground p-4 bg-muted/30 rounded-lg">
              <p>رقم المرجع: {acceptance.id}</p>
              <p className="mt-1">إصدار الشروط: {acceptance.terms_version}</p>
              <p className="mt-1">
                هذا المستند يثبت موافقتك القانونية على شروط وأحكام استخدام منصة آي ريسايكل
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewTermsAcceptance;
