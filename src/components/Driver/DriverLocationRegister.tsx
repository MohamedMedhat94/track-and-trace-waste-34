import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Navigation, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface DriverLocationRegisterProps {
  driverId: string;
  shipmentId?: string;
  onLocationUpdate?: (location: { latitude: number; longitude: number }) => void;
}

const DriverLocationRegister: React.FC<DriverLocationRegisterProps> = ({
  driverId,
  shipmentId,
  onLocationUpdate
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [lastLocation, setLastLocation] = useState<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  } | null>(null);
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "الموقع غير مدعوم",
        description: "متصفحك لا يدعم خدمة تحديد المواقع",
        variant: "destructive",
      });
      return;
    }

    const action = async () => {
      setIsLocating(true);
      
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              
              // Update driver location in database
              await supabase.rpc('update_driver_location', {
                driver_id_param: driverId,
                latitude_param: latitude,
                longitude_param: longitude
              });

              // Update local state
              const newLocation = {
                latitude,
                longitude,
                timestamp: new Date()
              };
              setLastLocation(newLocation);

              // Call callback if provided
              if (onLocationUpdate) {
                onLocationUpdate({ latitude, longitude });
              }

              resolve(newLocation);
            } catch (error) {
              reject(error);
            } finally {
              setIsLocating(false);
            }
          },
          (error) => {
            setIsLocating(false);
            let message = "لا يمكن الوصول إلى موقعك الحالي";
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message = "تم رفض إذن الوصول للموقع";
                break;
              case error.POSITION_UNAVAILABLE:
                message = "موقعك غير متاح";
                break;
              case error.TIMEOUT:
                message = "انتهت مهلة تحديد الموقع";
                break;
            }
            
            reject(new Error(message));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    };

    await validateAndExecute(
      'register_driver_location',
      action,
      'تم تسجيل موقعك بنجاح'
    );
  };

  const openLocationInMaps = () => {
    if (lastLocation) {
      const url = `https://www.google.com/maps?q=${lastLocation.latitude},${lastLocation.longitude}`;
      window.open(url, '_blank');
    }
  };

  const formatCoordinate = (coord: number) => {
    return coord.toFixed(6);
  };

  const getTimeSinceLocation = () => {
    if (!lastLocation) return '';
    
    const now = new Date();
    const diff = now.getTime() - lastLocation.timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return 'الآن';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-cairo flex items-center">
          <MapPin className="h-5 w-5 ml-2" />
          تسجيل الموقع الحالي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location Status */}
        {lastLocation && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className="bg-green-100 text-green-800">
                    موقع مسجل
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getTimeSinceLocation()}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">خط العرض:</span>
                    <span className="font-mono ml-2">
                      {formatCoordinate(lastLocation.latitude)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">خط الطول:</span>
                    <span className="font-mono ml-2">
                      {formatCoordinate(lastLocation.longitude)}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3 ml-1" />
                    تم التسجيل: {lastLocation.timestamp.toLocaleString('ar-SA')}
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={openLocationInMaps}
                className="ml-2"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Location Actions */}
        <div className="space-y-3">
          <Button
            onClick={getCurrentLocation}
            disabled={isLocating}
            className="w-full"
            size="lg"
          >
            {isLocating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                جاري تحديد الموقع...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 ml-2" />
                تسجيل الموقع الحالي
              </>
            )}
          </Button>

          {lastLocation && (
            <Button
              onClick={getCurrentLocation}
              variant="outline"
              className="w-full"
              disabled={isLocating}
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث الموقع
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">تعليمات تسجيل الموقع</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• تأكد من تفعيل خدمة تحديد المواقع في جهازك</li>
            <li>• اسمح للمتصفح بالوصول إلى موقعك</li>
            <li>• يُنصح بتحديث موقعك عند بداية ونهاية كل مرحلة من الشحنة</li>
            <li>• سيتم حفظ موقعك تلقائياً في النظام</li>
          </ul>
        </div>

        {/* Shipment Context */}
        {shipmentId && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              يتم تسجيل الموقع لشحنة رقم: <span className="font-medium">{shipmentId}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverLocationRegister;