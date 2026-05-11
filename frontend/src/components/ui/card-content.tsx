import React from 'react';

const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => {
  return <div className={className}>{children}</div>;
};

CardContent.displayName = 'CardContent';

export { CardContent };