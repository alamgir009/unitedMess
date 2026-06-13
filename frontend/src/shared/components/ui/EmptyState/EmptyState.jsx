import { cn } from '@/core/utils/helpers/string.helper';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {Icon && (
        <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground mb-4">
          <Icon className="w-10 h-10" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-h3 text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-body text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {action && action}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
export default EmptyState;
