import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Activity, Clock, User, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface SystemLog {
  id: string;
  user_id: string;
  user_email: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: any;
  created_at: string;
}

const SystemLogs: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل سجل النشاطات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-success text-success-foreground';
      case 'UPDATE': return 'bg-warning text-warning-foreground';
      case 'DELETE': return 'bg-destructive text-destructive-foreground';
      case 'VIEW': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'CREATE': return 'إنشاء';
      case 'UPDATE': return 'تحديث';
      case 'DELETE': return 'حذف';
      case 'VIEW': return 'عرض';
      default: return action;
    }
  };

  const getEntityText = (entity: string) => {
    switch (entity) {
      case 'company': return 'شركة';
      case 'driver': return 'سائق';
      case 'shipment': return 'شحنة';
      case 'user': return 'مستخدم';
      case 'waste_type': return 'نوع نفايات';
      default: return entity;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = !actionFilter || actionFilter === 'all' || log.action_type === actionFilter;
    const matchesEntity = !entityFilter || entityFilter === 'all' || log.entity_type === entityFilter;
    
    // Date range filtering
    let matchesDateRange = true;
    const logDate = new Date(log.created_at);
    
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      matchesDateRange = matchesDateRange && logDate >= fromDate;
    }
    
    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      matchesDateRange = matchesDateRange && logDate <= toDate;
    }
    
    return matchesSearch && matchesAction && matchesEntity && matchesDateRange;
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-cairo">غير مصرح لك بعرض سجل النشاطات</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل سجل النشاطات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">سجل النشاطات</h1>
          <p className="text-muted-foreground">
            تتبع جميع الأنشطة والعمليات في النظام
          </p>
        </div>
        <Button onClick={fetchLogs} className="font-cairo">
          <Activity className="h-4 w-4 ml-2" />
          تحديث السجل
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">إجمالي العمليات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">آخر 1000 عملية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">عمليات الإنشاء</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {logs.filter(l => l.action_type === 'CREATE').length}
            </div>
            <p className="text-xs text-muted-foreground">إضافة جديدة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">المستخدمين النشطين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.map(l => l.user_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">مستخدم مختلف</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">العمليات اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
            </div>
            <p className="text-xs text-muted-foreground">عملية اليوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث..."
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
                <SelectItem value="CREATE">إنشاء</SelectItem>
                <SelectItem value="UPDATE">تحديث</SelectItem>
                <SelectItem value="DELETE">حذف</SelectItem>
                <SelectItem value="VIEW">عرض</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="نوع الكائن" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الكائنات</SelectItem>
                <SelectItem value="company">شركة</SelectItem>
                <SelectItem value="driver">سائق</SelectItem>
                <SelectItem value="shipment">شحنة</SelectItem>
                <SelectItem value="user">مستخدم</SelectItem>
                <SelectItem value="waste_type">نوع نفايات</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              placeholder="من تاريخ"
              className="font-cairo"
            />

            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              placeholder="إلى تاريخ"
              className="font-cairo"
            />

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setActionFilter('');
                setEntityFilter('');
                setDateFromFilter('');
                setDateToFilter('');
              }}
              className="font-cairo"
            >
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">سجل العمليات</CardTitle>
          <CardDescription>
            {filteredLogs.length} عملية من أصل {logs.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <Badge className={getActionColor(log.action_type)}>
                      {getActionText(log.action_type)}
                    </Badge>
                    <span className="font-semibold font-cairo">
                      {getEntityText(log.entity_type)}
                    </span>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="h-4 w-4 ml-1" />
                      {log.user_email || 'نظام'}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 ml-1" />
                        {new Date(log.created_at).toLocaleString('ar-SA')}
                      </div>
                      {log.entity_id && (
                        <span>معرف الكائن: {log.entity_id}</span>
                      )}
                    </div>
                    
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <strong>التفاصيل:</strong>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-cairo">لا توجد عمليات تطابق معايير البحث</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemLogs;