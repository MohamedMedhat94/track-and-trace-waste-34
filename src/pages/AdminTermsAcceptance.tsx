import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileSignature, ArrowLeft, Search, Download, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminTermsAcceptance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [acceptances, setAcceptances] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAcceptances();
    } else {
      navigate('/');
    }
  }, [user]);

  const fetchAcceptances = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('terms_acceptance')
        .select('*')
        .order('accepted_at', { ascending: false });

      if (error) throw error;
      setAcceptances(data || []);
    } catch (error: any) {
      console.error('Error fetching acceptances:', error);
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
    acc.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadAcceptance = (acceptance: any) => {
    const pdfContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>الشروط والأحكام - ${acceptance.company_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          body { font-family: 'Cairo', sans-serif; padding: 40px; line-height: 1.8; }
          .header { text-align: center; border-bottom: 3px solid #006400; padding-bottom: 20px; margin-bottom: 30px; }
          .signature-section { margin-top: 40px; padding: 20px; border: 2px solid #006400; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>مستند الموافقة على الشروط والأحكام</h1>
          <p>${acceptance.company_name}</p>
        </div>
        <div class="signature-section">
          <p><strong>الاسم:</strong> ${acceptance.full_name}</p>
          <p><strong>التاريخ:</strong> ${new Date(acceptance.accepted_at).toLocaleString('ar-SA')}</p>
          ${acceptance.signature_data ? `<img src="${acceptance.signature_data}" style="max-width: 200px;">` : ''}
        </div>
        <div style="margin-top: 30px; white-space: pre-wrap;">
          ${acceptance.terms_content}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terms-${acceptance.company_name}-${acceptance.id}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-cairo">سجل الموافقات على الشروط</h1>
            <p className="text-muted-foreground">
              عرض جميع الموافقات المسجلة على شروط وأحكام المنصة
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-cairo">جميع الموافقات</CardTitle>
                <CardDescription>
                  {filteredAcceptances.length} موافقة من أصل {acceptances.length}
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الشركة</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الإصدار</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAcceptances.map((acceptance) => (
                  <TableRow key={acceptance.id}>
                    <TableCell className="font-medium">{acceptance.company_name}</TableCell>
                    <TableCell>{acceptance.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {acceptance.company_type === 'generator' ? 'مولد' :
                         acceptance.company_type === 'transporter' ? 'ناقل' : 'مُدوّر'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(acceptance.accepted_at).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>{acceptance.terms_version}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2 space-x-reverse">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAcceptance(acceptance)}
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
              <div className="text-center py-8 text-muted-foreground">
                لا توجد موافقات تطابق البحث
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminTermsAcceptance;
