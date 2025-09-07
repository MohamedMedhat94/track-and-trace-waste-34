import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowLeft } from 'lucide-react';
import MultiLocationTracker from '@/components/Driver/MultiLocationTracker';

const MultiLocationTracking: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="text-center p-6">
            <p>يرجى تسجيل الدخول للوصول لهذه الصفحة</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get driver ID - for demo purposes, using user ID
  // In a real app, you'd fetch the driver record linked to this user
  const driverId = user.id;

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-cairo flex items-center">
                <MapPin className="h-6 w-6 ml-2" />
                تتبع المواقع المتعددة
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                العودة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              يمكنك هنا تسجيل مواقع متعددة أثناء رحلتك وتتبع مسار الشحنة بالتفصيل
            </p>
          </CardContent>
        </Card>

        {/* Multi Location Tracker Component */}
        <MultiLocationTracker driverId={driverId} />
      </div>
    </div>
  );
};

export default MultiLocationTracking;