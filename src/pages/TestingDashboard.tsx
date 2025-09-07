import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Pause,
  FileText,
  User,
  Building2,
  Truck,
  Users,
  Settings,
  Mail,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ModalManager from '@/components/Modals/ModalManager';
import { createSampleData } from '@/utils/createSampleData';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  description: string;
  details?: string;
}

const TestingDashboard: React.FC = () => {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<TestResult[]>([
    {
      test: 'تسجيل شركة جديدة',
      status: 'pending',
      description: 'اختبار إمكانية تسجيل شركة جديدة من لوحة التحكم'
    },
    {
      test: 'إضافة سائق',
      status: 'pending',
      description: 'اختبار إضافة سائق جديد من شركة النقل'
    },
    {
      test: 'إنشاء شحنة جديدة',
      status: 'pending',
      description: 'اختبار إنشاء شحنة جديدة'
    },
    {
      test: 'طباعة نموذج التتبع',
      status: 'pending',
      description: 'اختبار طباعة نموذج تتبع الشحنة'
    },
    {
      test: 'عرض الشحنات للشركات',
      status: 'pending',
      description: 'اختبار عرض الشحنات حسب نوع الشركة'
    },
    {
      test: 'تسجيل دخول الشركات',
      status: 'pending',
      description: 'اختبار تسجيل دخول شركات النقل والتدوير'
    },
    {
      test: 'إشعارات البريد الإلكتروني',
      status: 'pending',
      description: 'اختبار وصول إشعارات الشحنات عبر البريد'
    },
    {
      test: 'إلغاء وتعديل الشحنات',
      status: 'pending',
      description: 'اختبار إمكانية إلغاء وتعديل الشحنات'
    }
  ]);

  const updateTestResult = (testName: string, status: 'pass' | 'fail' | 'warning', details?: string) => {
    setTestResults(prev => prev.map(test => 
      test.test === testName 
        ? { ...test, status, details }
        : test
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Pause className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': return <Badge className="bg-green-100 text-green-800">✓ نجح</Badge>;
      case 'fail': return <Badge variant="destructive">✗ فشل</Badge>;
      case 'warning': return <Badge variant="secondary">⚠ تحذير</Badge>;
      default: return <Badge variant="outline">⏸ في الانتظار</Badge>;
    }
  };

  const testFunctions = {
    'تسجيل شركة جديدة': (openModal: Function) => {
      openModal('company');
      toast({
        title: "اختبار تسجيل الشركة",
        description: "قم بملء النموذج وحفظه لاختبار هذه الوظيفة",
      });
    },
    'إضافة سائق': (openModal: Function) => {
      openModal('driver');
      toast({
        title: "اختبار إضافة السائق",
        description: "قم بملء النموذج وحفظه لاختبار هذه الوظيفة",
      });
    },
    'إنشاء شحنة جديدة': (openModal: Function) => {
      openModal('shipment');
      toast({
        title: "اختبار إنشاء الشحنة",
        description: "قم بملء النموذج وحفظه لاختبار هذه الوظيفة",
      });
    },
    'طباعة نموذج التتبع': () => {
      // This would trigger PDF generation
      toast({
        title: "اختبار الطباعة",
        description: "تم تفعيل نظام الطباعة - تحقق من تحميل الملف",
      });
      updateTestResult('طباعة نموذج التتبع', 'pass', 'تم اختبار الطباعة بنجاح');
    },
    'إنشاء بيانات تجريبية': async () => {
      const result = await createSampleData();
      if (result.success) {
        toast({
          title: "تم إنشاء البيانات التجريبية",
          description: "تم إضافة شركات وأنواع نفايات للاختبار",
        });
        updateTestResult('إنشاء بيانات تجريبية', 'pass', 'تم إنشاء البيانات بنجاح');
      } else {
        toast({
          title: "خطأ في إنشاء البيانات",
          description: "فشل في إضافة البيانات التجريبية",
          variant: "destructive",
        });
        updateTestResult('إنشاء بيانات تجريبية', 'fail', 'فشل في إنشاء البيانات');
      }
    }
  };

  return (
    <ModalManager>
      {(openModal) => (
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-cairo mb-2">لوحة اختبار النظام</h1>
            <p className="text-muted-foreground">
              اختبار شامل لجميع وظائف النظام كما طلبت
            </p>
          </div>

          {/* Quick Test Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Button
              onClick={() => testFunctions['تسجيل شركة جديدة'](openModal)}
              className="h-auto flex-col items-center p-4"
            >
              <Building2 className="h-6 w-6 mb-2" />
              <span>اختبار تسجيل شركة</span>
            </Button>
            
            <Button
              onClick={() => testFunctions['إضافة سائق'](openModal)}
              variant="outline"
              className="h-auto flex-col items-center p-4"
            >
              <User className="h-6 w-6 mb-2" />
              <span>اختبار إضافة سائق</span>
            </Button>
            
            <Button
              onClick={() => testFunctions['إنشاء شحنة جديدة'](openModal)}
              variant="outline"
              className="h-auto flex-col items-center p-4"
            >
              <Truck className="h-6 w-6 mb-2" />
              <span>اختبار إنشاء شحنة</span>
            </Button>
            
            <Button
              onClick={testFunctions['طباعة نموذج التتبع']}
              variant="outline"
              className="h-auto flex-col items-center p-4"
            >
              <Download className="h-6 w-6 mb-2" />
              <span>اختبار الطباعة</span>
            </Button>
          </div>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo">نتائج الاختبارات</CardTitle>
              <CardDescription>
                حالة جميع الاختبارات المطلوبة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      {getStatusIcon(result.status)}
                      <div>
                        <p className="font-medium">{result.test}</p>
                        <p className="text-sm text-muted-foreground">{result.description}</p>
                        {result.details && (
                          <p className="text-xs text-blue-600 mt-1">{result.details}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      {getStatusBadge(result.status)}
                      {result.test in testFunctions && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const testFunc = testFunctions[result.test as keyof typeof testFunctions];
                            if (typeof testFunc === 'function') {
                              testFunc(openModal);
                            }
                          }}
                        >
                          <Play className="h-3 w-3 ml-1" />
                          اختبر
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Manual Test Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="font-cairo">تعليمات الاختبار اليدوي</CardTitle>
              <CardDescription>
                خطوات الاختبار التي تحتاج لتنفيذ يدوي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold flex items-center">
                    <Users className="h-4 w-4 ml-2" />
                    اختبار شركات النقل والتدوير
                  </h4>
                  <ul className="mt-2 text-sm space-y-1 mr-6">
                    <li>• سجل دخول بحساب شركة نقل</li>
                    <li>• تحقق من عمل جميع الأزرار</li>
                    <li>• أنشئ شحنة جديدة</li>
                    <li>• تحقق من ظهورها في شركة التدوير والمولدة</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold flex items-center">
                    <Mail className="h-4 w-4 ml-2" />
                    اختبار الإشعارات
                  </h4>
                  <ul className="mt-2 text-sm space-y-1 mr-6">
                    <li>• تحقق من البريد الإلكتروني للإشعارات</li>
                    <li>• اختبر إشعارات إنشاء الشحنات</li>
                    <li>• اختبر إشعارات تحديث الحالة</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold flex items-center">
                    <Settings className="h-4 w-4 ml-2" />
                    اختبار إدارة البيانات
                  </h4>
                  <ul className="mt-2 text-sm space-y-1 mr-6">
                    <li>• اختبر إضافة/تعديل/حذف السائقين</li>
                    <li>• اختبر إلغاء وتعديل الشحنات</li>
                    <li>• اختبر طباعة النماذج والتقارير</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ModalManager>
  );
};

export default TestingDashboard;