import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Truck, Navigation, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  last_ping?: string;
  tracking_enabled?: boolean;
}

const ManagerMapView: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDrivers();
    
    // Set up real-time subscription for all drivers
    const subscription = supabase
      .channel('all_drivers')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'drivers' },
        (payload) => {
          const updatedDriver = payload.new as Driver;
          setDrivers(prev => prev.map(driver => 
            driver.id === updatedDriver.id ? updatedDriver : driver
          ));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_drivers_for_tracking');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast({
        title: "خطأ في تحميل السائقين",
        description: "لا يمكن تحميل قائمة السائقين",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openDriverLocation = (driver: Driver) => {
    if (driver.current_latitude && driver.current_longitude) {
      const url = `https://www.google.com/maps?q=${driver.current_latitude},${driver.current_longitude}`;
      window.open(url, '_blank');
    } else {
      toast({
        title: "موقع غير متاح",
        description: "موقع السائق غير متاح حالياً",
        variant: "destructive",
      });
    }
  };

  const isDriverOnline = (driver: Driver) => {
    if (!driver.last_ping) return false;
    const timeDiff = Date.now() - new Date(driver.last_ping).getTime();
    return timeDiff < 300000; // 5 minutes
  };

  const hasLocation = (driver: Driver) => {
    return driver.current_latitude && driver.current_longitude;
  };

  const getTimeSinceUpdate = (timestamp?: string) => {
    if (!timestamp) return 'غير متاح';
    
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return 'الآن';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-cairo">خريطة تتبع السائقين</h2>
          <p className="text-muted-foreground">
            تتبع مواقع السائقين في الوقت الفعلي
          </p>
        </div>
        <Button onClick={fetchDrivers} variant="outline">
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drivers List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo">قائمة السائقين</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {drivers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  لا توجد سائقين مسجلين
                </p>
              ) : (
                drivers.map((driver) => (
                  <div
                    key={driver.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedDriver?.id === driver.id ? 'bg-primary/10 border-primary' : ''
                    }`}
                    onClick={() => setSelectedDriver(driver)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{driver.name}</h4>
                        {driver.vehicle_plate && (
                          <p className="text-sm text-muted-foreground">
                            {driver.vehicle_plate}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge 
                          variant={isDriverOnline(driver) ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {isDriverOnline(driver) ? 'متصل' : 'غير متصل'}
                        </Badge>
                        {hasLocation(driver) && (
                          <Badge variant="outline" className="text-xs">
                            📍 موقع متاح
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Driver Details & Map */}
        <div className="lg:col-span-2">
          {selectedDriver ? (
            <div className="space-y-4">
              {/* Driver Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cairo flex items-center">
                    <Truck className="h-5 w-5 ml-2" />
                    تفاصيل السائق: {selectedDriver.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">الاسم:</span>
                        <p className="font-medium">{selectedDriver.name}</p>
                      </div>
                      {selectedDriver.phone && (
                        <div>
                          <span className="text-sm text-muted-foreground">الهاتف:</span>
                          <p className="font-medium">{selectedDriver.phone}</p>
                        </div>
                      )}
                      {selectedDriver.vehicle_type && (
                        <div>
                          <span className="text-sm text-muted-foreground">نوع المركبة:</span>
                          <p className="font-medium">{selectedDriver.vehicle_type}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {selectedDriver.vehicle_plate && (
                        <div>
                          <span className="text-sm text-muted-foreground">رقم اللوحة:</span>
                          <p className="font-medium">{selectedDriver.vehicle_plate}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-muted-foreground">الحالة:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={isDriverOnline(selectedDriver) ? 'default' : 'secondary'}>
                            {isDriverOnline(selectedDriver) ? 'متصل' : 'غير متصل'}
                          </Badge>
                          {hasLocation(selectedDriver) && (
                            <Badge variant="outline" className="text-green-600">
                              📍 موقع متاح
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location Information */}
              {hasLocation(selectedDriver) ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-cairo flex items-center">
                      <MapPin className="h-5 w-5 ml-2" />
                      معلومات الموقع
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground">خط العرض:</span>
                          <p className="font-mono text-sm">
                            {selectedDriver.current_latitude?.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">خط الطول:</span>
                          <p className="font-mono text-sm">
                            {selectedDriver.current_longitude?.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm text-muted-foreground">آخر تحديث:</span>
                        <p className="text-sm">
                          {getTimeSinceUpdate(selectedDriver.last_location_update)}
                        </p>
                      </div>

                      <Button
                        onClick={() => openDriverLocation(selectedDriver)}
                        className="w-full"
                      >
                        <Navigation className="h-4 w-4 ml-2" />
                        عرض في خرائط جوجل
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">موقع غير متاح</h3>
                    <p className="text-sm text-muted-foreground">
                      لا يتم مشاركة موقع هذا السائق حالياً
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">اختر سائق</h3>
                <p className="text-sm text-muted-foreground">
                  اختر سائق من القائمة لعرض تفاصيله وموقعه
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي السائقين</p>
                <p className="text-2xl font-bold">{drivers.length}</p>
              </div>
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">السائقين المتصلين</p>
                <p className="text-2xl font-bold text-green-600">
                  {drivers.filter(isDriverOnline).length}
                </p>
              </div>
              <Badge className="h-8 w-8 rounded-full bg-green-100 text-green-600">
                ●
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المواقع المتاحة</p>
                <p className="text-2xl font-bold text-blue-600">
                  {drivers.filter(hasLocation).length}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerMapView;