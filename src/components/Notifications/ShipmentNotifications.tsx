import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bell, Clock, CheckCircle, XCircle, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ShipmentNotification {
  id: string;
  shipment_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const ShipmentNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<ShipmentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.companyId) {
      fetchNotifications();
      
      // Subscribe to real-time notifications
      const channel = supabase
        .channel('shipment-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'shipment_notifications',
            filter: `recipient_company_id=eq.${user.companyId}`
          },
          (payload) => {
            const newNotification = payload.new as ShipmentNotification;
            setNotifications(prev => [newNotification, ...prev]);
            
            // Show toast for new notifications
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.companyId, toast]);

  const fetchNotifications = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipment_notifications')
        .select('*')
        .eq('recipient_company_id', user.companyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "خطأ في تحميل الإشعارات",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('shipment_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true } 
            : n
        )
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_request':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'auto_approved':
        return <AlertTriangle className="h-5 w-5 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'approval_request':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-300">يتطلب موافقة</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">مقبولة</Badge>;
      case 'rejected':
        return <Badge variant="destructive">مرفوضة</Badge>;
      case 'auto_approved':
        return <Badge className="bg-blue-100 text-blue-800">مقبولة تلقائياً</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">ملغية</Badge>;
      default:
        return <Badge variant="outline">إشعار</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center font-cairo">
            <Bell className="h-5 w-5 ml-2" />
            الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">جاري تحميل الإشعارات...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between font-cairo">
          <div className="flex items-center">
            <Bell className="h-5 w-5 ml-2" />
            إشعارات الشحنات
          </div>
          {notifications.filter(n => !n.is_read).length > 0 && (
            <Badge variant="destructive">
              {notifications.filter(n => !n.is_read).length} جديد
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          إشعارات متعلقة بحالة الشحنات وطلبات الموافقة
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد إشعارات حالياً
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.is_read 
                    ? 'bg-background border-border' 
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-1">
                        {notification.title}
                      </h4>
                      {getNotificationBadge(notification.notification_type)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString('ar-SA')}
                      </span>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs"
                        >
                          تعليم كمقروء
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipmentNotifications;