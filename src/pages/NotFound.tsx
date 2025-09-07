import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 font-cairo">404</h1>
        <p className="text-xl text-muted-foreground mb-4 font-cairo">عذراً! الصفحة غير موجودة</p>
        <a href="/" className="text-primary hover:text-primary/80 underline font-cairo">
          العودة للصفحة الرئيسية
        </a>
      </div>
    </div>
  );
};

export default NotFound;
