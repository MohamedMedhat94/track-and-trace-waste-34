import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Mail, Phone, Building2, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PendingUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
  company_id?: string;
  company?: {
    name: string;
    type: string;
  };
}

const PendingUsersDetails: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          company:companies(name, type)
        `)
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching pending users:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: `فشل في تحميل بيانات المستخدمين المعلقين: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserActivation = async (userId: string, activate: boolean) => {
    try {
      setProcessingId(userId);
      
      const { error } = await supabase.rpc('activate_user', {
        target_user_id: userId,
        activate: activate
      });

      if (error) throw error;

      toast({
        title: activate ? "تم تفعيل المستخدم" : "تم إلغاء تفعيل المستخدم",
        description: `تم ${activate ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`,
      });

      // Refresh the list
      await fetchPendingUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast({
        title: "خطأ في العملية",
        description: `فشل في تحديث حالة المستخدم: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مدير النظام';
      case 'generator':
        return 'شركة مولدة للنفايات';
      case 'transporter':
        return 'شركة نقل';
      case 'recycler':
        return 'شركة إعادة تدوير';
      case 'driver':
        return 'سائق';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'generator':
        return 'bg-blue-100 text-blue-800';
      case 'transporter':
        return 'bg-purple-100 text-purple-800';
      case 'recycler':
        return 'bg-green-100 text-green-800';
      case 'driver':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل بيانات المستخدمين المعلقين...</p>
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
            <h1 className="text-3xl font-bold font-cairo">المستخدمون المعلقون</h1>
            <p className="text-muted-foreground">
              المستخدمون الذين يحتاجون موافقة للدخول للنظام
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Users className="h-5 w-5 text-orange-600" />
          <span className="text-2xl font-bold">{users.length}</span>
          <span className="text-muted-foreground">مستخدم معلق</span>
        </div>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-cairo">لا يوجد مستخدمين معلقين</p>
            <p className="text-sm text-muted-foreground mt-2">
              جميع المستخدمين المسجلين تم تفعيلهم
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-cairo">
                        {user.full_name || 'غير محدد'}
                      </CardTitle>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleText(user.role)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {user.email && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.company && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">{user.company.name}</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    تاريخ التسجيل: {new Date(user.created_at).toLocaleDateString('ar-EG')}
                  </div>
                </div>
                
                <div className="pt-3 border-t space-y-2">
                  <Button
                    onClick={() => handleUserActivation(user.user_id, true)}
                    disabled={processingId === user.user_id}
                    className="w-full bg-green-600 hover:bg-green-700 font-cairo"
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    تفعيل المستخدم
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUserActivation(user.user_id, false)}
                    disabled={processingId === user.user_id}
                    className="w-full font-cairo border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 ml-2" />
                    رفض التفعيل
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingUsersDetails;