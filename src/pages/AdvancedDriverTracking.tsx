import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Navigation, MapPin } from 'lucide-react';
import AdvancedDriverTracker from '@/components/Driver/AdvancedDriverTracker';

const AdvancedDriverTracking: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Navigation className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-cairo">تتبع السائقين المتقدم</CardTitle>
                  <CardDescription className="text-lg">
                    مراقبة مواقع السائقين في الوقت الفعلي وعرض مساراتهم التفصيلية
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex items-center font-cairo"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                العودة
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Advanced Driver Tracker Component */}
        <AdvancedDriverTracker />
      </div>
    </div>
  );
};

export default AdvancedDriverTracking;