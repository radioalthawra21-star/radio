const StageProgressBar = ({ stages = [], currentStage = -1, workflowStatus }) => {
  if (!stages.length) return null;
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max py-2">
        {stages.map((stage, index) => {
          const isActive = index === currentStage && workflowStatus === 'in_progress';
          const isCompleted = index < currentStage || workflowStatus === 'approved';
          const isRejected = workflowStatus === 'rejected' && index === currentStage;
          let bgColor = 'bg-gray-300';
          let textColor = 'text-gray-500';
          let icon = '';
          if (isCompleted) { bgColor = 'bg-success'; textColor = 'text-white'; icon = '✓'; }
          else if (isActive) { bgColor = 'bg-warning'; textColor = 'text-white'; icon = '◉'; }
          else if (isRejected) { bgColor = 'bg-error'; textColor = 'text-white'; icon = '✕'; }
          return (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${bgColor} ${textColor} transition-all`}>
                  {icon || index + 1}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap ${isActive ? 'font-bold text-dark' : 'text-gray-500'}`}>
                  {stage.name}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-success' : 'bg-gray-300'}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StageProgressBar;
