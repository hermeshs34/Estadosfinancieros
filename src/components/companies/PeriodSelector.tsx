// ... existing code ...
import { PublishedStatusToggle } from '../PublishedStatusToggle';

// Dentro del componente, después de mostrar el período:
{selectedPeriod && (
  <div className="mt-2">
    <PublishedStatusToggle 
      period={selectedPeriod} 
      onToggle={(periodId, isPublished) => {
        // La función ya está disponible en el contexto
        togglePeriodPublishedStatus(periodId, isPublished);
      }}
    />
  </div>
)}
// ... existing code ...