import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Package, BarChart3, Truck, Recycle, Shield, Globe, UserPlus, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import companyLogo from '@/assets/company-logo.png';

interface Stats {
  activeCompanies: number;
  totalShipments: number;
  recyclingRate: number;
}

interface HomepageFeature {
  id: string;
  value: string;
  is_visible: boolean;
  display_order: number;
}

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    activeCompanies: 0,
    totalShipments: 0,
    recyclingRate: 95
  });
  const [loading, setLoading] = useState(true);
  const [homepageFeatures, setHomepageFeatures] = useState<HomepageFeature[]>([]);

  useEffect(() => {
    fetchStats();
    fetchHomepageFeatures();
  }, []);

  const fetchStats = async () => {
    try {
      const [companiesResult, shipmentsResult] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('shipments').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        activeCompanies: companiesResult.count || 0,
        totalShipments: shipmentsResult.count || 0,
        recyclingRate: 95
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHomepageFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_settings')
        .select('*')
        .eq('is_visible', true)
        .order('display_order');

      if (error) throw error;
      setHomepageFeatures(data || []);
    } catch (error) {
      console.error('Error fetching homepage features:', error);
    }
  };

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
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex justify-center mb-4 md:mb-6">
            <img src={companyLogo} alt="آي ريسايكل" className="h-16 md:h-20 w-auto" />
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold font-cairo text-foreground mb-3 md:mb-4">
            آي ريسايكل
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground font-cairo mb-4 md:mb-6 px-2">
            نظام متكامل لإدارة النفايات والحفاظ على البيئة
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm md:text-base">
            <Globe className="h-4 w-4 md:h-5 md:w-5" />
            <span>حلول ذكية لبيئة نظيفة</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-8 md:mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="h-full hover:shadow-lg transition-shadow border-border/50">
              <CardHeader className="text-center pb-2 md:pb-3 p-3 md:p-6">
                <div className="flex justify-center mb-2">
                  <div className="p-2 md:p-3 bg-primary/10 rounded-full">
                    {React.cloneElement(feature.icon, { className: "h-5 w-5 md:h-8 md:w-8 text-primary" })}
                  </div>
                </div>
                <CardTitle className="font-cairo text-sm md:text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <CardDescription className="text-center font-cairo text-xs md:text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <Card className="p-4 md:p-8 bg-card/80 backdrop-blur border-primary/20">
            <CardHeader className="p-0 pb-4 md:pb-6">
              <CardTitle className="text-xl md:text-2xl font-cairo mb-2 md:mb-4">ابدأ رحلتك معنا</CardTitle>
              <CardDescription className="text-sm md:text-lg font-cairo">
                انضم إلى آلاف الشركات التي تثق في حلولنا لإدارة النفايات
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="lg" 
                  className="font-cairo w-full sm:w-auto text-base"
                >
                  تسجيل الدخول
                </Button>
                <Button 
                  onClick={() => navigate('/register-company')} 
                  variant="outline" 
                  size="lg" 
                  className="font-cairo w-full sm:w-auto text-base"
                >
                  <UserPlus className="h-4 w-4 ml-2" />
                  تسجيل شركة جديدة
                </Button>
              </div>
              <p className="text-muted-foreground mt-4 font-cairo text-sm">
                سجل شركتك الآن بدون الحاجة لحساب مسبق
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
          <Card className="p-3 md:p-6 bg-primary/5 border-primary/20">
            <div className="text-2xl md:text-4xl font-bold text-primary font-cairo">
              {loading ? '...' : `+${stats.activeCompanies}`}
            </div>
            <div className="text-muted-foreground font-cairo text-xs md:text-base mt-1">شركة مسجلة</div>
          </Card>
          <Card className="p-3 md:p-6 bg-primary/5 border-primary/20">
            <div className="text-2xl md:text-4xl font-bold text-primary font-cairo">
              {loading ? '...' : `+${stats.totalShipments}`}
            </div>
            <div className="text-muted-foreground font-cairo text-xs md:text-base mt-1">شحنة معالجة</div>
          </Card>
          <Card className="p-3 md:p-6 bg-primary/5 border-primary/20">
            <div className="text-2xl md:text-4xl font-bold text-primary font-cairo">
              %{stats.recyclingRate}
            </div>
            <div className="text-muted-foreground font-cairo text-xs md:text-base mt-1">معدل إعادة التدوير</div>
          </Card>
        </div>

        {/* Dynamic Features List from Database */}
        {homepageFeatures.length > 0 && (
          <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {homepageFeatures.map((feature) => (
              <div key={feature.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm md:text-base font-cairo">{feature.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomePage;
