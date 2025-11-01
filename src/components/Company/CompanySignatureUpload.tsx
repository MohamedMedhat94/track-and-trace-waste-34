import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Upload, FileSignature, Stamp, Check, X } from 'lucide-react';

const CompanySignatureUpload: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [signatures, setSignatures] = useState<any>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user?.companyId) {
      fetchSignatures();
    }
  }, [user?.companyId]);

  const fetchSignatures = async () => {
    try {
      const { data, error } = await supabase
        .from('company_signatures')
        .select('*')
        .eq('company_id', user?.companyId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSignatures(data);
        
        // Load existing images
        if (data.signature_image_url) {
          const { data: signatureUrl } = await supabase.storage
            .from('company-documents')
            .createSignedUrl(data.signature_image_url, 3600);
          if (signatureUrl) setSignaturePreview(signatureUrl.signedUrl);
        }
        
        if (data.stamp_image_url) {
          const { data: stampUrl } = await supabase.storage
            .from('company-documents')
            .createSignedUrl(data.stamp_image_url, 3600);
          if (stampUrl) setStampPreview(stampUrl.signedUrl);
        }
      }
    } catch (error: any) {
      console.error('Error fetching signatures:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'signature' | 'stamp') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5242880) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "يجب أن يكون حجم الملف أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      toast({
        title: "نوع الملف غير مدعوم",
        description: "يرجى رفع صورة بصيغة PNG أو JPG أو WEBP",
        variant: "destructive",
      });
      return;
    }

    if (type === 'signature') {
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setStampFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStampPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, type: 'signature' | 'stamp') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.companyId}/${type}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('company-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return fileName;
  };

  const handleUpload = async () => {
    if (!user?.companyId) {
      toast({
        title: "خطأ",
        description: "لا يمكن تحديد شركتك",
        variant: "destructive",
      });
      return;
    }

    if (!signatureFile && !stampFile) {
      toast({
        title: "لا يوجد ملفات",
        description: "يرجى اختيار ملف واحد على الأقل للرفع",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let signatureUrl = signatures?.signature_image_url;
      let stampUrl = signatures?.stamp_image_url;

      // Upload signature if selected
      if (signatureFile) {
        signatureUrl = await uploadFile(signatureFile, 'signature');
      }

      // Upload stamp if selected
      if (stampFile) {
        stampUrl = await uploadFile(stampFile, 'stamp');
      }

      // Update or insert record
      const updateData: any = {
        company_id: user.companyId,
        uploaded_by: user.id,
      };

      if (signatureUrl) {
        updateData.signature_image_url = signatureUrl;
        updateData.signature_uploaded_at = new Date().toISOString();
      }

      if (stampUrl) {
        updateData.stamp_image_url = stampUrl;
        updateData.stamp_uploaded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('company_signatures')
        .upsert(updateData, {
          onConflict: 'company_id'
        });

      if (error) throw error;

      toast({
        title: "تم الرفع بنجاح",
        description: "تم رفع الامضاء والختم بنجاح",
      });

      // Reset and refresh
      setSignatureFile(null);
      setStampFile(null);
      fetchSignatures();
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "خطأ في الرفع",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center font-cairo">
          <FileSignature className="h-5 w-5 ml-2" />
          إدارة الامضاء والختم
        </CardTitle>
        <CardDescription>
          رفع الامضاء والختم الخاص بشركتك لاستخدامه في نماذج التتبع تلقائياً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Signature Upload */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center">
              <FileSignature className="h-4 w-4 ml-2" />
              الامضاء
            </Label>
            
            {signaturePreview && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <img 
                  src={signaturePreview} 
                  alt="Signature Preview" 
                  className="max-h-32 mx-auto object-contain"
                />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => handleFileChange(e, 'signature')}
                className="hidden"
                id="signature-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('signature-upload')?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 ml-2" />
                {signatureFile ? signatureFile.name : 'اختر صورة الامضاء'}
              </Button>
              {signatureFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSignatureFile(null);
                    setSignaturePreview(signatures?.signature_image_url || null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Stamp Upload */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center">
              <Stamp className="h-4 w-4 ml-2" />
              الختم
            </Label>
            
            {stampPreview && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <img 
                  src={stampPreview} 
                  alt="Stamp Preview" 
                  className="max-h-32 mx-auto object-contain"
                />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => handleFileChange(e, 'stamp')}
                className="hidden"
                id="stamp-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('stamp-upload')?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 ml-2" />
                {stampFile ? stampFile.name : 'اختر صورة الختم'}
              </Button>
              {stampFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setStampFile(null);
                    setStampPreview(signatures?.stamp_image_url || null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleUpload}
            disabled={loading || (!signatureFile && !stampFile)}
            className="min-w-[120px]"
          >
            {loading ? (
              <>جاري الرفع...</>
            ) : (
              <>
                <Check className="h-4 w-4 ml-2" />
                حفظ التغييرات
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-semibold mb-1">ملاحظات هامة:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>الحد الأقصى لحجم الملف: 5 ميجابايت</li>
            <li>الصيغ المدعومة: PNG, JPG, JPEG, WEBP</li>
            <li>يُفضل أن تكون الخلفية شفافة (PNG)</li>
            <li>سيظهر الامضاء والختم تلقائياً في جميع نماذج التتبع</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanySignatureUpload;
