import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, UserX, Users, Clock } from 'lucide-react';

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  activated_at?: string;
  activated_by?: string;
}

const UserActivationPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات المستخدمين",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserActivation = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.rpc('activate_user', {
        target_user_id: userId,
        activate: !currentStatus
      });

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.user_id === userId 
          ? { ...user, is_active: !currentStatus, activated_at: !currentStatus ? new Date().toISOString() : undefined }
          : user
      ));

      toast({
        title: "تم بنجاح",
        description: `تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم`,
      });
    } catch (error) {
      console.error('Error toggling user activation:', error);
      toast({
        title: "خطأ",
        description: "فشل في تغيير حالة المستخدم",
        variant: "destructive",
      });
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'مسؤول';
      case 'driver': return 'سائق';
      case 'generator': return 'مولد نفايات';
      case 'transporter': return 'شركة نقل';
      case 'recycler': return 'شركة إعادة تدوير';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground';
      case 'driver': return 'bg-primary text-primary-foreground';
      case 'generator': return 'bg-warning text-warning-foreground';
      case 'transporter': return 'bg-success text-success-foreground';
      case 'recycler': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const inactiveUsers = users.filter(user => !user.is_active);
  const activeUsers = users.filter(user => user.is_active);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-primary ml-4" />
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <UserCheck className="h-8 w-8 text-success ml-4" />
            <div>
              <p className="text-2xl font-bold">{activeUsers.length}</p>
              <p className="text-sm text-muted-foreground">مستخدمين نشطين</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-warning ml-4" />
            <div>
              <p className="text-2xl font-bold">{inactiveUsers.length}</p>
              <p className="text-sm text-muted-foreground">في انتظار التفعيل</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Activations */}
      {inactiveUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">المستخدمون في انتظار التفعيل</CardTitle>
            <CardDescription>
              المستخدمون الجدد الذين يحتاجون إلى موافقة المسؤول
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inactiveUsers.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <h3 className="font-semibold">{user.full_name || user.email}</h3>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleText(user.role)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      تاريخ التسجيل: {new Date(user.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Button
                      onClick={() => toggleUserActivation(user.user_id, user.is_active)}
                      size="sm"
                    >
                      <UserCheck className="h-4 w-4 ml-2" />
                      تفعيل
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">المستخدمون النشطون</CardTitle>
          <CardDescription>
            جميع المستخدمين المفعلين في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeUsers.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <h3 className="font-semibold">{user.full_name || user.email}</h3>
                    <Badge className={getRoleColor(user.role)}>
                      {getRoleText(user.role)}
                    </Badge>
                    <Badge variant="outline" className="text-success border-success">
                      مفعل
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    تاريخ التفعيل: {user.activated_at ? new Date(user.activated_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                  </p>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <Switch
                    checked={user.is_active}
                    onCheckedChange={() => toggleUserActivation(user.user_id, user.is_active)}
                  />
                  {user.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserActivation(user.user_id, user.is_active)}
                    >
                      <UserX className="h-4 w-4 ml-2" />
                      إلغاء التفعيل
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivationPanel;