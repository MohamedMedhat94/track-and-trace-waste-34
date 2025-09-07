import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Building2, Truck, Eye, Shield, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PasswordManager from '@/components/Admin/PasswordManager';

interface UserProfile {
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
    address: string;
  };
}

const ManageUsers: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          company:companies(name, type, address)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
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
      case 'generator': return 'شركة مولدة للنفايات';
      case 'transporter': return 'شركة نقل';
      case 'recycler': return 'شركة إعادة تدوير';
      case 'driver': return 'سائق';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'generator': return <Building2 className="h-4 w-4" />;
      case 'transporter': return <Truck className="h-4 w-4" />;
      case 'recycler': return <Building2 className="h-4 w-4" />;
      case 'driver': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm);
    const matchesRole = !roleFilter || roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    generator: users.filter(u => u.role === 'generator').length,
    transporter: users.filter(u => u.role === 'transporter').length,
    recycler: users.filter(u => u.role === 'recycler').length,
    driver: users.filter(u => u.role === 'driver').length,
  };

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">إدارة المستخدمين</h1>
          <p className="text-muted-foreground">
            عرض وإدارة جميع المستخدمين المسجلين في النظام
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 font-cairo">
          <TabsTrigger value="users" className="flex items-center">
            <Users className="h-4 w-4 ml-2" />
            قائمة المستخدمين
          </TabsTrigger>
          <TabsTrigger value="passwords" className="flex items-center">
            <Key className="h-4 w-4 ml-2" />
            إدارة كلمات المرور
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo flex items-center">
              <Shield className="h-4 w-4 ml-2" />
              المديرين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.admin}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo flex items-center">
              <Building2 className="h-4 w-4 ml-2" />
              الشركات المولدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.generator}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo flex items-center">
              <Truck className="h-4 w-4 ml-2" />
              شركات النقل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.transporter}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo flex items-center">
              <Building2 className="h-4 w-4 ml-2" />
              شركات التدوير
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.recycler}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo flex items-center">
              <Users className="h-4 w-4 ml-2" />
              السائقين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.driver}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو البريد أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 font-cairo"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="تصفية حسب الدور" />
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

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
              }}
              className="font-cairo"
            >
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">قائمة المستخدمين</CardTitle>
          <CardDescription>
            {filteredUsers.length} مستخدم من أصل {users.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {getRoleIcon(user.role)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg font-cairo">{user.full_name || 'غير محدد'}</h3>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Badge className={getRoleColor(user.role)}>
                          {getRoleText(user.role)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          انضم في {new Date(user.created_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <p>📧 {user.email}</p>
                    {user.phone && <p>📱 {user.phone}</p>}
                    {user.company && (
                      <p>🏢 {user.company.name} ({user.company.type})</p>
                    )}
                  </div>
                  {user.company?.address && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📍 {user.company.address}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2 space-x-reverse">
                  <Button variant="outline" size="sm" className="font-cairo">
                    <Eye className="h-4 w-4 ml-2" />
                    عرض التفاصيل
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-cairo">لا توجد مستخدمين يطابقون معايير البحث</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="passwords">
          <PasswordManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageUsers;