import React from 'react';
import { CardHeader } from './card-header';
import { CardTitle } from './card-title';
import { CardContent } from './card-content';

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => {
  return <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>{children}</div>;
};

Card.displayName = 'Card';

export { Card, CardHeader, CardTitle, CardContent };