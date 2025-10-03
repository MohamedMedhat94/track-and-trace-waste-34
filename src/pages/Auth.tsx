
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth, UserRole } from '@/context/AuthContext';
import { LogIn, UserPlus, Building2 } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: '' as UserRole | '',
  });

  const { signIn, signUp, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            title: "خطأ في تسجيل الدخول",
            description: error.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة",
            variant: "destructive",
          });
        }
      } else {
        if (!formData.fullName || !formData.role) {
          toast({
            title: "بيانات ناقصة",
            description: "يرجى ملء جميع الحقول المطلوبة",
            variant: "destructive",
          });
          return;
        }

        const { error, message } = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.role as UserRole
        );

        if (error) {
          toast({
            title: "خطأ في التسجيل",
            description: error.message || "فشل في إنشاء الحساب",
            variant: "destructive",
          });
        } else {
          setRegistrationSuccess(true);
          toast({
            title: "تم إرسال الطلب بنجاح",
            description: message || "سيتم مراجعة طلبك من قبل المدير",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <UserPlus className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-cairo text-green-700">
              تم إرسال الطلب بنجاح
            </CardTitle>
            <CardDescription className="text-base">
              تم إرسال طلب التسجيل الخاص بك للمراجعة من قبل المدير. 
              ستتلقى بريد إلكتروني عند الموافقة على الطلب وإنشاء الحساب.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                setRegistrationSuccess(false);
                setIsLogin(true);
                setFormData({ email: '', password: '', fullName: '', role: '' });
              }}
              className="w-full font-cairo"
            >
              العودة لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isLogin ? (
                <LogIn className="h-12 w-12 text-primary" />
              ) : (
                <UserPlus className="h-12 w-12 text-primary" />
              )}
            </div>
            <CardTitle className="text-3xl font-cairo">
              {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </CardTitle>
            <CardDescription className="text-lg">
              {isLogin 
                ? 'أدخل بياناتك للوصول إلى النظام' 
                : 'سيتم مراجعة طلبك من قبل المدير قبل تفعيل الحساب'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="font-cairo">الاسم الكامل</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    required={!isLogin}
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-cairo">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  placeholder="أدخل بريدك الإلكتروني"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-cairo">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  placeholder="أدخل كلمة المرور"
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="font-cairo">نوع الحساب</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleInputChange('role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generator">مولد النفايات</SelectItem>
                      <SelectItem value="transporter">ناقل النفايات</SelectItem>
                      <SelectItem value="recycler">مدور النفايات</SelectItem>
                      <SelectItem value="driver">سائق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-cairo"
                disabled={isLoading}
              >
                {isLoading 
                  ? 'جاري المعالجة...' 
                  : (isLogin ? 'تسجيل الدخول' : 'إرسال طلب التسجيل')
                }
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ email: '', password: '', fullName: '', role: '' });
                }}
                className="font-cairo"
              >
                {isLogin 
                  ? 'لا تملك حساب؟ إنشاء حساب جديد' 
                  : 'لديك حساب؟ تسجيل الدخول'
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground font-cairo">
                أو يمكنك تسجيل شركتك مباشرة
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/register-company')}
                className="w-full font-cairo"
              >
                <Building2 className="h-4 w-4 ml-2" />
                تسجيل شركة جديدة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
