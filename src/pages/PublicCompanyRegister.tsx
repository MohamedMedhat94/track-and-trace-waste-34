import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import CompanyForm from '@/components/Forms/CompanyForm';

const PublicCompanyRegister: React.FC = () => {
  const handleCompanySubmit = (data: any) => {
    console.log('تم تسجيل الشركة:', data);
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-cairo">تسجيل شركة جديدة</CardTitle>
            <CardDescription className="text-lg">
              يمكنك تسجيل شركتك في النظام بدون الحاجة لحساب مسبق
            </CardDescription>
          </CardHeader>
        </Card>
        
        <CompanyForm onSubmit={handleCompanySubmit} submitViaEdgeFunction />
      </div>
    </div>
  );
};

export default PublicCompanyRegister;