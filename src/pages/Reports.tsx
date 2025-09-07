import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Download, Search, Filter, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PDFGenerator from '@/components/PDF/PDFGenerator';

const Reports: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch shipments with related data
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select(`
          *,
          generator_company:companies!shipments_generator_company_id_fkey(name),
          transporter_company:companies!shipments_transporter_company_id_fkey(name),
          recycler_company:companies!shipments_recycler_company_id_fkey(name),
          waste_type:waste_types(name)
        `)
        .order('created_at', { ascending: false });

      if (shipmentError) throw shipmentError;

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      setShipments(shipmentData || []);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل بيانات التقارير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'in_transit': return 'bg-primary text-primary-foreground';
      case 'delivered': return 'bg-success text-success-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'in_transit': return 'قيد النقل';
      case 'delivered': return 'تم التسليم';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = shipment.shipment_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || statusFilter === 'all' || shipment.status === statusFilter;
    
    // Date range filtering
    let matchesDateRange = true;
    const shipmentDate = new Date(shipment.created_at);
    
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      matchesDateRange = matchesDateRange && shipmentDate >= fromDate;
    }
    
    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999); // End of day
      matchesDateRange = matchesDateRange && shipmentDate <= toDate;
    }
    
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground">
            عرض وتصدير التقارير التفصيلية للشحنات والشركات
          </p>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center font-cairo"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <Button className="font-cairo">
            <Download className="h-4 w-4 ml-2" />
            تصدير التقرير الشامل
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">إجمالي الشحنات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipments.length}</div>
            <p className="text-xs text-muted-foreground">جميع الشحنات المسجلة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">الشحنات المكتملة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {shipments.filter(s => s.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">تم إنجازها بنجاح</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">الشركات النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">جميع الفئات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">متوسط وقت التسليم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5</div>
            <p className="text-xs text-muted-foreground">أيام</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الشحنة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 font-cairo"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="حالة الشحنة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="in_transit">قيد النقل</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              placeholder="من تاريخ"
              className="font-cairo"
            />

            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              placeholder="إلى تاريخ"
              className="font-cairo"
            />

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDateFromFilter('');
                setDateToFilter('');
              }}
              className="font-cairo"
            >
              <Filter className="h-4 w-4 ml-2" />
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">سجل الشحنات التفصيلي</CardTitle>
          <CardDescription>
            {filteredShipments.length} شحنة من أصل {shipments.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredShipments.map((shipment) => (
              <div
                key={shipment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <span className="font-semibold text-lg">{shipment.shipment_number}</span>
                    <Badge className={getStatusColor(shipment.status)}>
                      {getStatusText(shipment.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <p>المولد: {shipment.generator_company?.name}</p>
                    <p>الناقل: {shipment.transporter_company?.name}</p>
                    <p>المعيد: {shipment.recycler_company?.name}</p>
                  </div>
                  <div className="flex space-x-4 space-x-reverse text-xs text-muted-foreground mt-2">
                    <span>تاريخ الإنشاء: {new Date(shipment.created_at).toLocaleDateString('ar-SA')}</span>
                    <span>نوع النفايات: {shipment.waste_type?.name}</span>
                    <span>الكمية: {shipment.quantity} كيلوجرام</span>
                  </div>
                </div>
                <div className="flex space-x-2 space-x-reverse">
                  <PDFGenerator shipmentId={shipment.shipment_number} data={shipment} />
                </div>
              </div>
            ))}
            
            {filteredShipments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground font-cairo">لا توجد شحنات تطابق معايير البحث</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;