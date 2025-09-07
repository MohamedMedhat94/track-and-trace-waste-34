import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft } from 'lucide-react';
import PDFCompanyImporter from '@/components/Forms/PDFCompanyImporter';

const CompanyImporter: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="text-center p-6">
            <p>يرجى تسجيل الدخول للوصول لهذه الصفحة</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is admin
  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="text-center p-6">
            <p>هذه الصفحة متاحة للمدراء فقط</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-cairo flex items-center">
                <FileText className="h-6 w-6 ml-2" />
                استيراد الشركات من PDF
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                العودة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              استيراد بيانات الشركات المستخرجة من ملف PDF وإضافتها للنظام
            </p>
          </CardContent>
        </Card>

        {/* PDF Company Importer Component */}
        <PDFCompanyImporter />
      </div>
    </div>
  );
};

export default CompanyImporter;