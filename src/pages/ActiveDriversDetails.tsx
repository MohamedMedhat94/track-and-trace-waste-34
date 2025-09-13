import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, MapPin, Clock, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActiveDriver {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_plate: string;
  current_latitude: number;
  current_longitude: number;
  last_ping: string;
  is_online: boolean;
  transport_company_id: string;
}

const ActiveDriversDetails: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveDrivers();
  }, []);

  const fetchActiveDrivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_active_drivers')
        .order('last_ping', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error('Error fetching active drivers:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: `فشل في تحميل بيانات السائقين النشطين: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatLastSeen = (lastPing: string) => {
    const now = new Date();
    const pingTime = new Date(lastPing);
    const diffMinutes = Math.floor((now.getTime() - pingTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    return `منذ ${Math.floor(diffMinutes / 60)} ساعة`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل بيانات السائقين النشطين...</p>
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
            <h1 className="text-3xl font-bold font-cairo">السائقون النشطون</h1>
            <p className="text-muted-foreground">
              عرض تفصيلي لجميع السائقين المتصلين حالياً
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">{drivers.length}</span>
          <span className="text-muted-foreground">سائق نشط</span>
        </div>
      </div>

      {drivers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-cairo">لا يوجد سائقين متصلين حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver) => (
            <Card key={driver.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-cairo">{driver.name}</CardTitle>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        متصل
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
                  {driver.vehicle_type && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="text-muted-foreground">نوع المركبة:</span>
                      <span>{driver.vehicle_type}</span>
                    </div>
                  )}
                  {driver.vehicle_plate && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="text-muted-foreground">رقم اللوحة:</span>
                      <span>{driver.vehicle_plate}</span>
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
                    <span>آخر اتصال: {formatLastSeen(driver.last_ping)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveDriversDetails;