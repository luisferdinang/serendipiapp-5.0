
import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string; // Optional name of the item being deleted for more context
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, itemName }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Eliminación" size="sm">
      <p className="text-slate-300 mb-6">
        {itemName 
          ? `¿Estás seguro de que deseas eliminar "${itemName}"?` 
          : '¿Estás seguro de que deseas eliminar este elemento?'}
      </p>
      <p className="text-sm text-yellow-400 mb-6">Esta acción no se puede deshacer.</p>
      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>
          Eliminar
        </Button>
      </div>
    </Modal>
  );
};
