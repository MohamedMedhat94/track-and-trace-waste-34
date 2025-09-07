import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CompanyForm from '@/components/Forms/CompanyForm';
import DriverForm from '@/components/Forms/DriverForm';

interface ModalManagerProps {
  children: (openModal: (type: string, data?: any) => void) => React.ReactNode;
}

const ModalManager: React.FC<ModalManagerProps> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: string | null;
    data?: any;
  }>({
    isOpen: false,
    type: null,
    data: null,
  });

  const openModal = (type: string, data?: any) => {
    setModalState({ isOpen: true, type, data });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, data: null });
  };

  const handleSubmit = (submittedData: any) => {
    console.log('Form submitted:', submittedData);
    closeModal();
  };

  const renderModalContent = () => {
    switch (modalState.type) {
      case 'company':
        return (
          <CompanyForm
            onClose={closeModal}
            onSubmit={handleSubmit}
            editData={modalState.data}
            submitViaEdgeFunction
          />
        );
      case 'driver':
        return (
          <DriverForm
            onClose={closeModal}
            onSubmit={handleSubmit}
            editData={modalState.data}
          />
        );
      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (modalState.type) {
      case 'company':
        return modalState.data ? 'تعديل بيانات الشركة' : 'إضافة شركة جديدة';
      case 'driver':
        return modalState.data ? 'تعديل بيانات السائق' : 'إضافة سائق جديد';
      default:
        return '';
    }
  };

  return (
    <>
      {children(openModal)}
      
      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">{getModalTitle()}</DialogTitle>
          </DialogHeader>
          {renderModalContent()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ModalManager;