import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createSampleData } from '@/utils/createSampleData';
import { Database, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TestDataGenerator: React.FC = () => {
  // Only available in development environment - security measure
  if (import.meta.env.PROD) {
    return null;
  }

  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const testCompanies = [
    {
      type: 'ناقل',
      email: 'transporter@test.com',
      company: 'شركة النقل السريع'
    },
    {
      type: 'مدور',
      email: 'recycler@test.com',
      company: 'مصنع إعادة التدوير المتقدم'
    },
    {
      type: 'مولد 1',
      email: 'generator1@test.com',
      company: 'شركة الصناعات الغذائية المصرية'
    },
    {
      type: 'مولد 2',
      email: 'generator2@test.com',
      company: 'مجموعة المصانع الكيماوية'
    }
  ];

  const handleCreateTestData = async () => {
    setIsCreating(true);
    
    try {
      const result = await createSampleData();
      
      if (result.success) {
        toast({
          title: "تم إنشاء البيانات التجريبية بنجاح",
          description: "تم إنشاء الشركات والمستخدمين التجريبيين"
        });
        setShowCredentials(true);
      } else {
        throw new Error(result.error?.message || 'فشل في إنشاء البيانات');
      }
    } catch (error: any) {
      console.error('Error creating test data:', error);
      toast({
        title: "خطأ في إنشاء البيانات",
        description: error.message || "فشل في إنشاء البيانات التجريبية",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center font-cairo">
            <Database className="h-5 w-5 ml-2" />
            إنشاء بيانات اختبار
          </CardTitle>
          <CardDescription>
            إنشاء شركات ومستخدمين تجريبيين للاختبار والتطوير
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              هذه الوظيفة ستنشئ 4 شركات تجريبية مع حسابات مستخدمين لكل منها. 
              يمكن استخدام هذه البيانات للاختبار والتطوير.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleCreateTestData} 
            disabled={isCreating}
            className="w-full"
          >
            <Users className="h-4 w-4 ml-2" />
            {isCreating ? 'جاري إنشاء البيانات...' : 'إنشاء البيانات التجريبية'}
          </Button>
        </CardContent>
      </Card>

      {showCredentials && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center font-cairo text-green-600">
              <CheckCircle className="h-5 w-5 ml-2" />
              بيانات تسجيل الدخول التجريبية
            </CardTitle>
            <CardDescription>
              استخدم هذه البيانات لتسجيل الدخول والاختبار
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testCompanies.map((company, index) => (
                <Card key={index} className="bg-gray-50 dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-primary">
                        {company.type} - {company.company}
                      </h4>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium">الإيميل: </span>
                          <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {company.email}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">كلمة المرور: </span>
                          <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            يتم إنشاؤها تلقائيًا (تحقق من سجلات النظام)
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>ملاحظة:</strong> هذه بيانات اختبار فقط. لا تستخدمها في البيئة الإنتاجية.
                يتم إنشاء كلمات المرور تلقائيًا عند إنشاء الحسابات.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestDataGenerator;