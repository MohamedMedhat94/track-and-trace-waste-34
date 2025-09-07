import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Clock, Route, Play, Square, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface DriverLocation {
  id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  recorded_at: string;
  address?: string;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicle_plate?: string;
  current_latitude?: number;
  current_longitude?: number;
  is_online?: boolean;
  last_ping?: string;
}

interface EnhancedDriverTrackerProps {
  driverId: string;
  shipmentId?: string;
}

const EnhancedDriverTracker: React.FC<EnhancedDriverTrackerProps> = ({
  driverId,
  shipmentId
}) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();

  useEffect(() => {
    fetchDriverInfo();
    fetchRecentLocations();
    
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [driverId]);

  const fetchDriverInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error) throw error;
      setDriver(data);
    } catch (error) {
      console.error('Error fetching driver info:', error);
    }
  };

  const fetchRecentLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_route_history')
        .select('*')
        .eq('driver_id', driverId)
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const startTracking = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "خدمة الموقع غير متوفرة",
        description: "المتصفح لا يدعم خدمة تحديد الموقع",
        variant: "destructive",
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000
    };

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        
        const action = async () => {
          await supabase.rpc('add_driver_location_point', {
            driver_id_param: driverId,
            latitude_param: latitude,
            longitude_param: longitude,
            location_type_param: 'tracking',
            shipment_id_param: shipmentId || null,
            speed_param: speed,
            heading_param: heading,
            notes_param: 'تتبع تلقائي'
          });
          
          // Update driver current location
          await supabase.rpc('update_driver_current_location', {
            driver_id_param: driverId,
            latitude_param: latitude,
            longitude_param: longitude,
            speed_param: speed,
            heading_param: heading
          });

          return { latitude, longitude };
        };

        const result = await validateAndExecute(
          'update_driver_location',
          action
        );

        if (result.success) {
          // Update local state
          fetchRecentLocations();
          if (driver) {
            setDriver(prev => prev ? {
              ...prev,
              current_latitude: latitude,
              current_longitude: longitude,
              is_online: true,
              last_ping: new Date().toISOString()
            } : null);
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: "خطأ في تحديد الموقع",
          description: error.message,
          variant: "destructive",
        });
      },
      options
    );

    setWatchId(id);
    setIsTracking(true);
    toast({
      title: "تم بدء التتبع",
      description: "بدأ تتبع موقع السائق",
    });
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast({
      title: "تم إيقاف التتبع",
      description: "تم إيقاف تتبع موقع السائق",
    });
  };

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const formatSpeed = (speed: number | null | undefined) => {
    if (!speed) return 'غير محدد';
    return `${Math.round(speed * 3.6)} كم/ساعة`;
  };

  const formatDirection = (heading: number | null | undefined) => {
    if (heading === null || heading === undefined) return 'غير محدد';
    
    const directions = [
      'شمال', 'شمال شرق', 'شرق', 'جنوب شرق',
      'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'
    ];
    
    const index = Math.round(heading / 45) % 8;
    return directions[index];
  };

  return (
    <div className="space-y-6">
      {/* Driver Info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center">
            <MapPin className="h-5 w-5 ml-2" />
            معلومات السائق
          </CardTitle>
        </CardHeader>
        <CardContent>
          {driver ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">اسم السائق</Label>
                <p className="font-semibold">{driver.name}</p>
              </div>
              {driver.phone && (
                <div>
                  <Label className="text-sm font-medium">رقم الهاتف</Label>
                  <p>{driver.phone}</p>
                </div>
              )}
              {driver.vehicle_plate && (
                <div>
                  <Label className="text-sm font-medium">لوحة المركبة</Label>
                  <p>{driver.vehicle_plate}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">الحالة</Label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Badge variant={driver.is_online ? "default" : "secondary"}>
                    {driver.is_online ? "متصل" : "غير متصل"}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">جاري تحميل معلومات السائق...</p>
          )}
        </CardContent>
      </Card>

      {/* Tracking Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center">
            <Route className="h-5 w-5 ml-2" />
            تحكم في التتبع
          </CardTitle>
          <CardDescription>
            بدء أو إيقاف تتبع موقع السائق في الوقت الفعلي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={startTracking}
              disabled={isTracking}
              className="flex-1"
            >
              <Play className="h-4 w-4 ml-2" />
              {isTracking ? "التتبع نشط" : "بدء التتبع"}
            </Button>
            <Button
              onClick={stopTracking}
              disabled={!isTracking}
              variant="outline"
              className="flex-1"
            >
              <Square className="h-4 w-4 ml-2" />
              إيقاف التتبع
            </Button>
          </div>
          
          {driver?.current_latitude && driver?.current_longitude && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">الموقع الحالي:</p>
                  <p className="text-xs text-muted-foreground">
                    {driver.current_latitude.toFixed(6)}, {driver.current_longitude.toFixed(6)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openInMaps(driver.current_latitude!, driver.current_longitude!)}
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center">
            <Clock className="h-5 w-5 ml-2" />
            سجل المواقع الأخيرة ({locations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              لا توجد مواقع مسجلة
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {locations.map((location, index) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(location.recorded_at).toLocaleString('ar-SA')}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</div>
                      <div>🏃 {formatSpeed(location.speed)}</div>
                      <div>🧭 {formatDirection(location.heading)}</div>
                    </div>
                    
                    {location.address && (
                      <div className="text-sm mt-1">📍 {location.address}</div>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openInMaps(location.latitude, location.longitude)}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDriverTracker;