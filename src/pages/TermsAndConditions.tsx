import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileSignature, Check, AlertTriangle } from 'lucide-react';
import SignatureCanvas from '@/components/Terms/SignatureCanvas';
import { getTermsForCompanyType, TERMS_VERSION } from '@/constants/termsContent';

const TermsAndConditions: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [termsContent, setTermsContent] = useState('');
  const [companyType, setCompanyType] = useState<'generator' | 'transporter' | 'recycler'>('generator');

  useEffect(() => {
    // Check if user already accepted terms
    checkTermsAcceptance();
    fetchUserCompanyData();
  }, [user]);

  const checkTermsAcceptance = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('terms_acceptance')
        .select('*')
        .eq('user_id', user.id)
        .eq('terms_version', TERMS_VERSION)
        .maybeSingle();

      if (data) {
        // User already accepted, redirect to dashboard
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking terms acceptance:', error);
    }
  };

  const fetchUserCompanyData = async () => {
    if (!user?.companyId) return;

    try {
      const { data: company } = await supabase
        .from('companies')
        .select('name, type')
        .eq('id', user.companyId)
        .single();

      if (company) {
        setCompanyName(company.name);
        setCompanyType(company.type as 'generator' | 'transporter' | 'recycler');
        setTermsContent(getTermsForCompanyType(company.type as any));
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  };

  const handleSignatureSave = (data: string) => {
    setSignatureData(data);
    toast({
      title: "تم حفظ التوقيع",
      description: "تم حفظ توقيعك بنجاح",
    });
  };

  const handleSubmit = async () => {
    if (!accepted) {
      toast({
        title: "يجب الموافقة",
        description: "يجب الموافقة على الشروط والأحكام للمتابعة",
        variant: "destructive",
      });
      return;
    }

    if (!fullName.trim()) {
      toast({
        title: "الاسم مطلوب",
        description: "يرجى إدخال الاسم الكامل",
        variant: "destructive",
      });
      return;
    }

    if (!signatureData) {
      toast({
        title: "التوقيع مطلوب",
        description: "يرجى التوقيع في المربع المخصص",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get user IP (simplified)
      const ipAddress = 'N/A';
      const userAgent = navigator.userAgent;

      // Save terms acceptance
      const { error } = await supabase
        .from('terms_acceptance')
        .insert({
          user_id: user?.id,
          company_id: user?.companyId,
          company_type: companyType,
          full_name: fullName.trim(),
          signature_data: signatureData,
          company_name: companyName,
          terms_version: TERMS_VERSION,
          terms_content: termsContent,
          ip_address: ipAddress,
          user_agent: userAgent
        });

      if (error) throw error;

      // Update profile
      await supabase
        .from('profiles')
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      toast({
        title: "تم قبول الشروط",
        description: "تم حفظ موافقتك على الشروط والأحكام بنجاح",
      });

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving terms acceptance:', error);
      toast({
        title: "خطأ في الحفظ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <FileSignature className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-cairo">الشروط والأحكام</CardTitle>
            <CardDescription className="text-lg">
              يرجى قراءة الشروط والأحكام بعناية قبل استخدام المنصة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Alert */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3 space-x-reverse">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">تنويه هام:</p>
                <p>
                  قبل المتابعة، يجب عليك قراءة جميع الشروط والأحكام بعناية والموافقة عليها.
                  موافقتك على هذه الشروط تعتبر عقداً ملزماً قانونياً.
                </p>
              </div>
            </div>

            {/* Terms Content */}
            <div>
              <h3 className="font-semibold text-lg mb-3 font-cairo">نص الشروط والأحكام</h3>
              <ScrollArea className="h-96 w-full rounded-lg border bg-muted/50 p-6">
                <div className="whitespace-pre-wrap font-cairo text-sm leading-relaxed">
                  {termsContent}
                </div>
              </ScrollArea>
            </div>

            {/* User Information */}
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-lg font-cairo">معلومات التوقيع</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم الكامل *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    className="font-cairo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    disabled
                    className="font-cairo bg-muted"
                  />
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <Label>التوقيع الإلكتروني *</Label>
                <SignatureCanvas
                  onSave={handleSignatureSave}
                  onClear={() => setSignatureData(null)}
                />
                {signatureData && (
                  <div className="flex items-center text-sm text-green-600">
                    <Check className="h-4 w-4 ml-2" />
                    تم حفظ التوقيع
                  </div>
                )}
              </div>
            </div>

            {/* Acceptance Checkbox */}
            <div className="flex items-start space-x-3 space-x-reverse p-4 border rounded-lg">
              <Checkbox
                id="accept"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="accept"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                أوافق على جميع الشروط والأحكام المذكورة أعلاه، وأقر بأنني قرأتها وفهمتها بالكامل،
                وأمنح المنصة توكيلاً غير قابل للإلغاء لاستخدام بياناتي والتوقيع نيابة عني على المستندات
                الإلكترونية وفقاً للسياسات المذكورة. كما أقر بتحمل المسؤولية القانونية الكاملة عن أي
                مخالفات قد أرتكبها وعدم الرجوع قضائياً على المنصة.
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleSubmit}
                disabled={loading || !accepted || !fullName.trim() || !signatureData}
                className="min-w-[200px]"
                size="lg"
              >
                {loading ? (
                  'جاري الحفظ...'
                ) : (
                  <>
                    <Check className="h-5 w-5 ml-2" />
                    قبول والمتابعة
                  </>
                )}
              </Button>
            </div>

            {/* Footer Note */}
            <div className="text-center text-xs text-muted-foreground p-4 bg-muted/30 rounded-lg">
              <p>
                بمجرد الموافقة، سيتم حفظ نسخة إلكترونية موقعة من هذا المستند في سجلاتنا.
                يمكنك طلب نسخة من موافقتك في أي وقت من خلال التواصل مع الدعم الفني.
              </p>
              <p className="mt-2 font-semibold">
                تاريخ الإصدار: {new Date().toLocaleDateString('ar-SA')} | الإصدار: {TERMS_VERSION}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;
