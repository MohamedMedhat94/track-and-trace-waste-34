import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Truck, Package, Recycle, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface CompanyShipment {
  id: string;
  shipment_number: string;
  status: string;
  quantity: number;
  created_at: string;
  waste_type_name: string;
  generator_company_name: string;
  transporter_company_name: string;
  recycler_company_name: string;
}

interface CompanyStats {
  total_shipments: number;
  active_shipments: number;
  completed_shipments: number;
  total_waste_processed: number;
}

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<CompanyShipment[]>([]);
  const [stats, setStats] = useState<CompanyStats>({
    total_shipments: 0,
    active_shipments: 0,
    completed_shipments: 0,
    total_waste_processed: 0
  });
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetchCompanyData();
  }, [profile]);

const fetchCompanyData = async () => {

    try {
      setLoading(true);

      // Fetch company info and shipments
      let shipmentsData: CompanyShipment[] = [];

      if (profile?.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (companyError) throw companyError;
        setCompanyInfo(company);

        // Get company shipments based on company type
        let companyType = 'generator';
        if (profile.role === 'transporter') companyType = 'transporter';
        else if (profile.role === 'recycler') companyType = 'recycler';

        const { data, error } = await supabase
          .rpc('get_company_shipments', { company_type: companyType });

        if (error) throw error;
        shipmentsData = data || [];
      } else {
        setCompanyInfo(null);
        const { data: userRes } = await supabase.auth.getUser();
        const currentUserId = userRes?.user?.id;

        if (currentUserId) {
          const { data: created, error: createdErr } = await supabase
            .from('shipments')
            .select('id, shipment_number, status, quantity, created_at')
            .eq('created_by', currentUserId)
            .order('created_at', { ascending: false });

          if (createdErr) throw createdErr;

          shipmentsData = (created || []).map((s: any) => ({
            id: s.id,
            shipment_number: s.shipment_number,
            status: s.status,
            quantity: s.quantity,
            created_at: s.created_at,
            waste_type_name: 'غير محدد',
            generator_company_name: 'غير محدد',
            transporter_company_name: 'غير محدد',
            recycler_company_name: 'غير محدد',
          }));
        } else {
          shipmentsData = [];
        }
      }

      setShipments(shipmentsData);

      // Calculate stats
      const total = shipmentsData?.length || 0;
      const active = shipmentsData?.filter(s => ['pending', 'in_transit', 'processing'].includes(s.status)).length || 0;
      const completed = shipmentsData?.filter(s => s.status === 'completed').length || 0;
      const totalWaste = shipmentsData?.filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;

      setStats({
        total_shipments: total,
        active_shipments: active,
        completed_shipments: completed,
        total_waste_processed: totalWaste
      });

    } catch (error: any) {
      console.error('Error fetching company data:', error);
      toast.error('حدث خطأ في تحميل بيانات الشركة');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'approved': return 'مُوافق عليه';
      case 'in_transit': return 'في الطريق';
      case 'delivered': return 'تم التسليم';
      case 'processing': return 'قيد المعالجة';
      case 'completed': return 'مُكتمل';
      case 'cancelled': return 'مُلغى';
      default: return status;
    }
  };

  const getCompanyTypeIcon = (type: string) => {
    switch (type) {
      case 'transporter': return <Truck className="h-5 w-5" />;
      case 'recycler': return <Recycle className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل بيانات الشركة...</p>
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
            {getCompanyTypeIcon(companyInfo?.type)}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                لوحة تحكم {companyInfo?.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {companyInfo?.type === 'generator' && 'شركة مولدة للنفايات'}
                {companyInfo?.type === 'transporter' && 'شركة نقل'}
                {companyInfo?.type === 'recycler' && 'شركة تدوير'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الشحنات</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_shipments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الشحنات النشطة</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.active_shipments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الشحنات المُكتملة</CardTitle>
              <Recycle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed_shipments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي النفايات المعالجة</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.total_waste_processed.toLocaleString()} كغ
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              شحنات الشركة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shipments.length > 0 ? (
              <div className="space-y-4">
                {shipments.map((shipment) => (
                  <div key={shipment.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">
                          شحنة رقم: {shipment.shipment_number}
                        </h3>
                        <Badge className={getStatusColor(shipment.status)}>
                          {getStatusText(shipment.status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(shipment.created_at).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">نوع النفايات:</span> {shipment.waste_type_name}
                      </div>
                      <div>
                        <span className="font-medium">الكمية:</span> {shipment.quantity} كغ
                      </div>
                      <div>
                        <span className="font-medium">الشركة المولدة:</span> {shipment.generator_company_name}
                      </div>
                      <div>
                        <span className="font-medium">شركة النقل:</span> {shipment.transporter_company_name}
                      </div>
                      <div>
                        <span className="font-medium">شركة التدوير:</span> {shipment.recycler_company_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد شحنات لهذه الشركة حالياً
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyDashboard;