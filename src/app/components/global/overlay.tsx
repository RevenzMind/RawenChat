export default function ModalOverlay({
  isOpen,
  onClose, // Necesitas agregar esta prop
  children,
}: {
  isOpen: boolean;
  onClose: () => void; 
  children?: React.ReactNode; // Permite pasar contenido al modal   
}) {
  if (!isOpen) return null;

  // Función para manejar el clic en el overlay
  const handleOverlayClick = (e: React.MouseEvent) => {
    // Solo cerrar si el clic fue en el overlay, no en el contenido
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick} // Clic en el overlay
    >
      <div
        className="bg-[#18181b] p-6 rounded-lg shadow-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()} // Prevenir que el clic se propague
      >
        {children}
      </div>
    </div>
  );
}