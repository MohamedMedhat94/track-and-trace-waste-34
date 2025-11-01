import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CompanySignatureUpload from '@/components/Company/CompanySignatureUpload';

const CompanySignatures: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-cairo">إدارة الامضاءات والأختام</h1>
            <p className="text-muted-foreground">
              رفع وإدارة الامضاء والختم الرسمي لشركتك
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center font-cairo"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة
          </Button>
        </div>

        {/* Upload Component */}
        <CompanySignatureUpload />

        {/* Information Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">كيف يعمل النظام؟</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="ml-2">•</span>
              <span>عند رفع الامضاء والختم، سيتم استخدامهما تلقائياً في جميع نماذج التتبع</span>
            </li>
            <li className="flex items-start">
              <span className="ml-2">•</span>
              <span>عند طباعة أي نموذج تتبع، سيظهر الامضاء والختم في المكان المخصص</span>
            </li>
            <li className="flex items-start">
              <span className="ml-2">•</span>
              <span>الامضاءات مرتبطة بشركتك فقط ولا يمكن لأحد آخر رؤيتها أو استخدامها</span>
            </li>
            <li className="flex items-start">
              <span className="ml-2">•</span>
              <span>يمكنك تحديث الامضاء والختم في أي وقت</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CompanySignatures;
