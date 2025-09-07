import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock, Truck, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface Driver {
  id: string;
  name: string;
  phone?: string;
  license_number?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  last_ping?: string;
  tracking_enabled?: boolean;
}

interface DriverTrackerProps {
  driverId: string;
  shipmentId?: string;
  showControls?: boolean;
}

const DriverTracker: React.FC<DriverTrackerProps> = ({
  driverId,
  shipmentId,
  showControls = false
}) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchingLocation, setWatchingLocation] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();

  useEffect(() => {
    fetchDriverData();
    
    // Set up real-time subscription for driver updates
    const subscription = supabase
      .channel(`driver_${driverId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverId}` },
        (payload) => {
          setDriver(payload.new as Driver);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [driverId]);

  const fetchDriverData = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error) throw error;
      setDriver(data);
    } catch (error) {
      console.error('Error fetching driver:', error);
      toast({
        title: "خطأ في تحميل بيانات السائق",
        description: "لا يمكن تحميل بيانات السائق",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "الموقع غير مدعوم",
        description: "متصفحك لا يدعم خدمة تحديد المواقع",
        variant: "destructive",
      });
      return;
    }

    const action = async () => {
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          await supabase.rpc('update_driver_location', {
            driver_id_param: driverId,
            latitude_param: latitude,
            longitude_param: longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
          toast({
            title: "خطأ في تحديد الموقع",
            description: "لا يمكن الوصول إلى موقعك الحالي",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      setWatchId(id);
      setWatchingLocation(true);
    };

    await validateAndExecute(
      'start_driver_tracking',
      action,
      'تم تفعيل تتبع الموقع بنجاح'
    );
  };

  const stopLocationTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setWatchingLocation(false);
      
      toast({
        title: "تم إيقاف التتبع",
        description: "تم إيقاف تتبع الموقع",
      });
    }
  };

  const openInMaps = () => {
    if (driver?.current_latitude && driver?.current_longitude) {
      const url = `https://www.google.com/maps?q=${driver.current_latitude},${driver.current_longitude}`;
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!driver) {
    return (
      <Card>
        <CardContent className="text-center p-6">
          <p className="text-muted-foreground">لا يمكن العثور على بيانات السائق</p>
        </CardContent>
      </Card>
    );
  }

  const isOnline = driver.last_ping ? 
    (Date.now() - new Date(driver.last_ping).getTime()) < 300000 : false; // 5 minutes

  const hasLocation = driver.current_latitude && driver.current_longitude;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-cairo flex items-center">
          <User className="h-5 w-5 ml-2" />
          معلومات السائق والتتبع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Driver Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium flex items-center">
              <User className="h-4 w-4 ml-2" />
              {driver.name}
            </h4>
            {driver.phone && (
              <p className="text-sm text-muted-foreground">📞 {driver.phone}</p>
            )}
            {driver.license_number && (
              <p className="text-sm text-muted-foreground">🆔 {driver.license_number}</p>
            )}
          </div>
          
          <div>
            {driver.vehicle_type && (
              <p className="text-sm">
                <Truck className="h-4 w-4 inline ml-1" />
                {driver.vehicle_type}
              </p>
            )}
            {driver.vehicle_plate && (
              <p className="text-sm text-muted-foreground">🚗 {driver.vehicle_plate}</p>
            )}
            
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant={isOnline ? 'default' : 'secondary'}>
                {isOnline ? 'متصل' : 'غير متصل'}
              </Badge>
              {hasLocation && (
                <Badge variant="outline" className="text-green-600">
                  📍 موقع متاح
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Location Info */}
        {hasLocation && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center">
                  <MapPin className="h-4 w-4 ml-2" />
                  الموقع الحالي
                </h4>
                <p className="text-sm text-muted-foreground">
                  خط العرض: {driver.current_latitude?.toFixed(6)}
                </p>
                <p className="text-sm text-muted-foreground">
                  خط الطول: {driver.current_longitude?.toFixed(6)}
                </p>
                {driver.last_location_update && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 inline ml-1" />
                    آخر تحديث: {new Date(driver.last_location_update).toLocaleString('ar-SA')}
                  </p>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={openInMaps}
                className="flex items-center space-x-2"
              >
                <Navigation className="h-4 w-4" />
                <span>عرض في الخريطة</span>
              </Button>
            </div>
          </div>
        )}

        {/* Tracking Controls */}
        {showControls && (
          <div className="border-t pt-4 space-y-2">
            <h4 className="font-medium">تحكم في التتبع</h4>
            
            {!watchingLocation ? (
              <Button
                onClick={startLocationTracking}
                className="w-full"
                variant="default"
              >
                <MapPin className="h-4 w-4 ml-2" />
                بدء تتبع الموقع
              </Button>
            ) : (
              <Button
                onClick={stopLocationTracking}
                className="w-full"
                variant="destructive"
              >
                <MapPin className="h-4 w-4 ml-2" />
                إيقاف تتبع الموقع
              </Button>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
              يتم تحديث الموقع تلقائياً كل بضع ثوانٍ عند التفعيل
            </p>
            
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">تسجيل مواقع متعددة:</p>
              <Button
                onClick={() => window.open('/driver-tracking', '_blank')}
                variant="outline"
                className="w-full"
              >
                <MapPin className="h-4 w-4 ml-2" />
                فتح تتبع المواقع المتعددة
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverTracker;