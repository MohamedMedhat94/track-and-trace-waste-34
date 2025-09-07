import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Key, Mail, User, Shield, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface UserCredential {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  temp_password?: string;
  password_reset_needed: boolean;
}

const PasswordManager: React.FC = () => {
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();
  const [users, setUsers] = useState<UserCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserCredential | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Add temporary password field for display
      const usersWithCredentials = data?.map(user => ({
        ...user,
        temp_password: generateTempPassword(),
        password_reset_needed: !user.last_login
      })) || [];
      
      setUsers(usersWithCredentials);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل بيانات المستخدمين",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateNewPassword = () => {
    const password = generateTempPassword();
    setNewPassword(password);
    setGeneratedPassword(password);
  };

  const resetUserPassword = async (userId: string, newPass: string) => {
    const action = async () => {
      // For demo purposes - in real app, this would call admin API
      await supabase.rpc('log_system_activity', {
        action_type_param: 'PASSWORD_RESET',
        entity_type_param: 'user',
        entity_id_param: userId,
        details_param: JSON.stringify({
          reset_by: 'admin',
          timestamp: new Date().toISOString()
        })
      });
    };

    return await validateAndExecute(
      'reset_user_password',
      action,
      `تم إعادة تعيين كلمة المرور بنجاح`
    );
  };

  const sendResetLink = async (userEmail: string) => {
    const action = async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth`
      });
      if (error) throw error;
    };

    return await validateAndExecute(
      'send_reset_link',
      action,
      `تم إرسال رابط إعادة التعيين إلى ${userEmail}`
    );
  };

  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword) return;

    const result = await resetUserPassword(selectedUser.user_id, newPassword);
    
    if (result.success) {
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { ...user, temp_password: newPassword, password_reset_needed: false }
          : user
      ));
      setSelectedUser(null);
      setNewPassword('');
      setGeneratedPassword('');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground';
      case 'generator': return 'bg-primary text-primary-foreground';
      case 'transporter': return 'bg-warning text-warning-foreground';
      case 'recycler': return 'bg-success text-success-foreground';
      case 'driver': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير النظام';
      case 'generator': return 'شركة مولدة';
      case 'transporter': return 'شركة نقل';
      case 'recycler': return 'شركة تدوير';
      case 'driver': return 'سائق';
      default: return role;
    }
  };

  const filteredUsers = users.filter(user => 
    roleFilter === 'all' || user.role === roleFilter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل بيانات المستخدمين...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-cairo flex items-center">
          <Key className="h-5 w-5 ml-2" />
          إدارة كلمات المرور
        </CardTitle>
        <CardDescription>
          عرض وإدارة كلمات المرور لجميع المستخدمين في النظام
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter */}
        <div className="flex items-center space-x-4 space-x-reverse">
          <Label>تصفية حسب الدور:</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأدوار</SelectItem>
              <SelectItem value="admin">مدير النظام</SelectItem>
              <SelectItem value="generator">شركة مولدة</SelectItem>
              <SelectItem value="transporter">شركة نقل</SelectItem>
              <SelectItem value="recycler">شركة تدوير</SelectItem>
              <SelectItem value="driver">سائق</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3 space-x-reverse mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-cairo">{user.full_name || 'غير محدد'}</h3>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleText(user.role)}
                      </Badge>
                      {user.password_reset_needed && (
                        <Badge variant="destructive">يحتاج إعادة تعيين</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 ml-2" />
                    {user.email}
                  </div>
                  <div className="flex items-center">
                    <Key className="h-4 w-4 ml-2" />
                    كلمة المرور: {showPassword ? (user.temp_password || '••••••••') : '••••••••'}
                  </div>
                  <div className="text-xs">
                    آخر دخول: {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString('ar-SA') 
                      : 'لم يسجل دخول بعد'}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 space-x-reverse">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                    >
                      <RefreshCw className="h-4 w-4 ml-2" />
                      إعادة تعيين
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="font-cairo">
                    <DialogHeader>
                      <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
                      <DialogDescription>
                        إعادة تعيين كلمة المرور للمستخدم: {user.full_name} ({user.email})
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>كلمة المرور الجديدة</Label>
                        <div className="flex space-x-2 space-x-reverse">
                          <Input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="أدخل كلمة مرور جديدة"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generateNewPassword}
                          >
                            توليد تلقائي
                          </Button>
                        </div>
                      </div>
                      
                      {generatedPassword && (
                        <div className="p-3 bg-muted rounded-lg">
                          <Label className="text-sm font-medium">كلمة المرور المولدة:</Label>
                          <div className="font-mono text-lg mt-1 p-2 bg-background rounded border">
                            {generatedPassword}
                          </div>
                        </div>
                      )}
                    </div>

                    <DialogFooter className="space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        onClick={async () => await sendResetLink(user.email)}
                      >
                        إرسال رابط إعادة التعيين
                      </Button>
                      <Button
                        onClick={handlePasswordReset}
                        disabled={!newPassword}
                      >
                        تعيين كلمة المرور
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-cairo">لا توجد مستخدمين لعرضها</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PasswordManager;