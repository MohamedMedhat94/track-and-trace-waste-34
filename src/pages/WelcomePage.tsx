import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Package, BarChart3, Truck, Recycle, Shield, Globe, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import companyLogo from '@/assets/company-logo.png';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Package className="h-8 w-8 text-primary" />,
      title: "إدارة الشحنات",
      description: "تتبع ومراقبة شحنات النفايات من المصدر إلى وجهتها النهائية"
    },
    {
      icon: <Truck className="h-8 w-8 text-primary" />,
      title: "تتبع النقل",
      description: "مراقبة مركبات النقل والسائقين في الوقت الفعلي"
    },
    {
      icon: <Recycle className="h-8 w-8 text-primary" />,
      title: "إعادة التدوير",
      description: "إدارة عمليات إعادة التدوير وتقييم الأثر البيئي"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "التقارير",
      description: "إنتاج تقارير شاملة وإحصائيات مفصلة"
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "إدارة المستخدمين",
      description: "إدارة الشركات والمستخدمين والأذونات"
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "الأمان",
      description: "حماية البيانات والامتثال للمعايير البيئية"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img src={companyLogo} alt="آي ريسايكل" className="h-20 w-auto" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-cairo text-foreground mb-4">
            آي ريسايكل
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-cairo mb-8">
            نظام متكامل لإدارة النفايات والحفاظ على البيئة
          </p>
          <div className="flex items-center justify-center space-x-2 space-x-reverse text-muted-foreground">
            <Globe className="h-5 w-5" />
            <span>حلول ذكية لبيئة نظيفة</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="text-center pb-3">
                <div className="flex justify-center mb-2">
                  {feature.icon}
                </div>
                <CardTitle className="font-cairo text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center font-cairo">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <Card className="p-8">
            <CardHeader>
              <CardTitle className="text-2xl font-cairo mb-4">ابدأ رحلتك معنا</CardTitle>
              <CardDescription className="text-lg font-cairo">
                انضم إلى آلاف الشركات التي تثق في حلولنا لإدارة النفايات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/auth')} size="lg" className="font-cairo">
                  تسجيل الدخول
                </Button>
                <Button 
                  onClick={() => navigate('/register-company')} 
                  variant="outline" 
                  size="lg" 
                  className="font-cairo"
                >
                  <UserPlus className="h-4 w-4 ml-2" />
                  تسجيل شركة جديدة
                </Button>
              </div>
              <p className="text-muted-foreground mt-4 font-cairo">
                سجل شركتك الآن بدون الحاجة لحساب مسبق
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-primary font-cairo">+500</div>
            <div className="text-muted-foreground font-cairo">شركة مسجلة</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary font-cairo">+10000</div>
            <div className="text-muted-foreground font-cairo">شحنة معالجة</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary font-cairo">%95</div>
            <div className="text-muted-foreground font-cairo">معدل إعادة التدوير</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;