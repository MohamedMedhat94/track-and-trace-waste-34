import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, TrendingUp, Package, Recycle, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompanyStat {
  company_id: string;
  company_name: string;
  company_type: string;
  total_shipments: number;
  active_shipments: number;
  completed_shipments: number;
  total_waste_processed: number;
}

const AdminCompaniesStats = () => {
  const navigate = useNavigate();
  const [companiesStats, setCompaniesStats] = useState<CompanyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalCompanies: 0,
    totalShipments: 0,
    totalWasteProcessed: 0,
    activeShipments: 0
  });

  useEffect(() => {
    fetchCompaniesStats();
  }, []);

  const fetchCompaniesStats = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_companies_stats');

      if (error) throw error;

      setCompaniesStats(data || []);

      // Calculate overall totals
      const totalCompanies = data?.length || 0;
      const totalShipments = data?.reduce((sum, company) => sum + company.total_shipments, 0) || 0;
      const totalWasteProcessed = data?.reduce((sum, company) => sum + company.total_waste_processed, 0) || 0;
      const activeShipments = data?.reduce((sum, company) => sum + company.active_shipments, 0) || 0;

      setTotalStats({
        totalCompanies,
        totalShipments,
        totalWasteProcessed,
        activeShipments
      });

    } catch (error: any) {
      console.error('Error fetching companies stats:', error);
      toast.error('حدث خطأ في تحميل إحصائيات الشركات');
    } finally {
      setLoading(false);
    }
  };

  const getCompanyTypeIcon = (type: string) => {
    switch (type) {
      case 'transporter': return <Truck className="h-4 w-4" />;
      case 'recycler': return <Recycle className="h-4 w-4" />;
      case 'generator': return <Package className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const getCompanyTypeText = (type: string) => {
    switch (type) {
      case 'transporter': return 'شركة نقل';
      case 'recycler': return 'شركة تدوير';
      case 'generator': return 'شركة مولدة';
      default: return type;
    }
  };

  const getCompanyTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'transporter': return 'bg-blue-100 text-blue-800';
      case 'recycler': return 'bg-green-100 text-green-800';
      case 'generator': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل إحصائيات الشركات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                إحصائيات الشركات
              </h1>
              <p className="text-sm text-muted-foreground">
                عرض تفصيلي لأداء جميع الشركات المسجلة في النظام
              </p>
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الشركات</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalCompanies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الشحنات</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalShipments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الشحنات النشطة</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalStats.activeShipments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي النفايات المعالجة</CardTitle>
              <Recycle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalStats.totalWasteProcessed.toLocaleString()} كغ
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              إحصائيات تفصيلية للشركات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companiesStats.length > 0 ? (
              <div className="space-y-4">
                {companiesStats.map((company) => (
                  <div key={company.company_id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getCompanyTypeIcon(company.company_type)}
                        <div>
                          <h3 className="font-semibold text-lg">{company.company_name}</h3>
                          <Badge className={getCompanyTypeBadgeColor(company.company_type)}>
                            {getCompanyTypeText(company.company_type)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {company.total_shipments}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          إجمالي الشحنات
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                        <span className="font-medium">الشحنات النشطة:</span>
                        <span className="font-bold text-blue-600">{company.active_shipments}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                        <span className="font-medium">الشحنات المُكتملة:</span>
                        <span className="font-bold text-green-600">{company.completed_shipments}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                        <span className="font-medium">النفايات المعالجة:</span>
                        <span className="font-bold text-purple-600">
                          {company.total_waste_processed.toLocaleString()} كغ
                        </span>
                      </div>
                    </div>

                    {/* Performance Indicator */}
                    <div className="mt-4 flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        معدل الإكمال: 
                        <span className="font-semibold ml-1">
                          {company.total_shipments > 0 
                            ? Math.round((company.completed_shipments / company.total_shipments) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${company.total_shipments > 0 
                              ? (company.completed_shipments / company.total_shipments) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد شركات مسجلة في النظام حالياً
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCompaniesStats;