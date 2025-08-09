import React from "react";
import "./style/Modal.css"; // 🔹 Agrega estilos CSS para que se vea bien

const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {children}
        <button className="modal-close" onClick={onClose}>
          ❌
        </button>
      </div>
    </div>
  );
};

export default Modal;
