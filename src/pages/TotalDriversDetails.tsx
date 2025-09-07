import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, Search, Mail, Phone, Truck, MapPin, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_type: string;
  vehicle_type: string;
  vehicle_plate: string;
  current_latitude: number;
  current_longitude: number;
  is_online: boolean;
  last_ping: string;
  created_at: string;
  transport_company_id: string;
}

const TotalDriversDetails: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllDrivers();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchTerm]);

  const fetchAllDrivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: `فشل في تحميل بيانات السائقين: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDrivers = () => {
    let filtered = drivers;

    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.phone?.includes(searchTerm) ||
        driver.license_number?.includes(searchTerm) ||
        driver.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDrivers(filtered);
  };

  const formatLastSeen = (lastPing: string) => {
    if (!lastPing) return 'غير محدد';
    const now = new Date();
    const pingTime = new Date(lastPing);
    const diffMinutes = Math.floor((now.getTime() - pingTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffMinutes < 1440) return `منذ ${Math.floor(diffMinutes / 60)} ساعة`;
    return `منذ ${Math.floor(diffMinutes / 1440)} يوم`;
  };

  const stats = {
    total: drivers.length,
    online: drivers.filter(d => d.is_online).length,
    offline: drivers.filter(d => !d.is_online).length,
    withVehicle: drivers.filter(d => d.vehicle_type).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل بيانات السائقين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/')}
            className="font-cairo"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة للوحة التحكم
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-cairo">إجمالي السائقين</h1>
            <p className="text-muted-foreground">
              عرض تفصيلي لجميع السائقين المسجلين في النظام
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">{drivers.length}</span>
          <span className="text-muted-foreground">سائق</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">إجمالي السائقين</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.online}</div>
                <p className="text-sm text-muted-foreground">متصلين</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.offline}</div>
                <p className="text-sm text-muted-foreground">غير متصلين</p>
              </div>
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.withVehicle}</div>
                <p className="text-sm text-muted-foreground">لديهم مركبات</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">البحث</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو البريد أو الهاتف أو رقم الرخصة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 font-cairo"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setSearchTerm('')}
              className="font-cairo"
            >
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Drivers List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">قائمة السائقين</CardTitle>
          <CardDescription>
            {filteredDrivers.length} سائق من أصل {drivers.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-cairo">لا توجد سائقين يطابقون معايير البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDrivers.map((driver) => (
                <Card key={driver.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          driver.is_online ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Users className={`h-5 w-5 ${
                            driver.is_online ? 'text-green-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-cairo">
                            {driver.name || 'غير محدد'}
                          </CardTitle>
                          <Badge variant={driver.is_online ? "default" : "secondary"} className={
                            driver.is_online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                          }>
                            {driver.is_online ? 'متصل' : 'غير متصل'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {driver.email && (
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{driver.email}</span>
                        </div>
                      )}
                      {driver.phone && (
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{driver.phone}</span>
                        </div>
                      )}
                      {driver.license_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">رقم الرخصة:</span>
                          <span className="font-medium">{driver.license_number}</span>
                        </div>
                      )}
                      {driver.license_type && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">نوع الرخصة:</span>
                          <span>{driver.license_type}</span>
                        </div>
                      )}
                      {driver.vehicle_type && (
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span>{driver.vehicle_type}</span>
                        </div>
                      )}
                      {driver.vehicle_plate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">رقم اللوحة:</span>
                          <span className="font-medium">{driver.vehicle_plate}</span>
                        </div>
                      )}
                      {driver.current_latitude && driver.current_longitude && (
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs">
                            {driver.current_latitude.toFixed(4)}, {driver.current_longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">آخر اتصال: {formatLastSeen(driver.last_ping)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        تاريخ التسجيل: {new Date(driver.created_at).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TotalDriversDetails;