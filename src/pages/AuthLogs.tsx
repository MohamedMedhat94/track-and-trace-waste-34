import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, User, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthLog {
  id: string;
  user_id: string;
  email: string;
  action: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

const AuthLogs: React.FC = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchAuthLogs();
    
    // Set up real-time subscription for new auth logs
    const channel = supabase
      .channel('auth-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auth_logs'
        },
        (payload) => {
          setLogs(prev => [payload.new as AuthLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAuthLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('auth_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching auth logs:', error);
      toast({
        title: "خطأ في تحميل السجلات",
        description: "حدث خطأ أثناء تحميل سجلات المصادقة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-success text-success-foreground';
      case 'logout': return 'bg-warning text-warning-foreground';
      case 'signup': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'login': return 'تسجيل دخول';
      case 'logout': return 'تسجيل خروج';
      case 'signup': return 'تسجيل جديد';
      default: return action;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return '🔑';
      case 'logout': return '🚪';
      case 'signup': return '👤';
      default: return '📝';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.ip_address?.includes(searchTerm);
    const matchesAction = !actionFilter || actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل سجلات المصادقة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo flex items-center">
            <Shield className="h-8 w-8 ml-3" />
            سجلات المصادقة
          </h1>
          <p className="text-muted-foreground">
            تتبع جميع عمليات تسجيل الدخول والخروج والتسجيل الجديد
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">إجمالي العمليات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">جميع عمليات المصادقة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">تسجيل الدخول</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {logs.filter(log => log.action === 'login').length}
            </div>
            <p className="text-xs text-muted-foreground">عمليات دخول ناجحة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">المستخدمين الفريدين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.map(log => log.email)).size}
            </div>
            <p className="text-xs text-muted-foreground">مستخدمين مختلفين</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالبريد الإلكتروني أو IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 font-cairo"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="نوع العملية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع العمليات</SelectItem>
                <SelectItem value="login">تسجيل دخول</SelectItem>
                <SelectItem value="logout">تسجيل خروج</SelectItem>
                <SelectItem value="signup">تسجيل جديد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">سجل العمليات المفصل</CardTitle>
          <CardDescription>
            {filteredLogs.length} عملية من أصل {logs.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <span className="text-2xl">{getActionIcon(log.action)}</span>
                    <div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="font-semibold">{log.email}</span>
                        <Badge className={getActionColor(log.action)}>
                          {getActionText(log.action)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground mt-1">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 ml-1" />
                          {new Date(log.created_at).toLocaleString('ar-SA')}
                        </span>
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                      </div>
                      {log.user_agent && (
                        <div className="text-xs text-muted-foreground mt-1 max-w-md truncate">
                          {log.user_agent}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-cairo">لا توجد سجلات تطابق معايير البحث</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthLogs;