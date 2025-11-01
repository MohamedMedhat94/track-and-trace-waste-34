import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Pen } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
  onClear: () => void;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ onSave, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Configure drawing context
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onClear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className="space-y-3">
      <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-40 cursor-crosshair touch-none"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <Pen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">وقّع هنا باستخدام الماوس أو اللمس</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty}
        >
          <X className="h-4 w-4 ml-2" />
          مسح
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isEmpty}
        >
          حفظ التوقيع
        </Button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
