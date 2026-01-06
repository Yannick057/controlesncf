import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface ControlsTableProps<T> {
  title: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
}

export function ControlsTable<T extends { id: string | number }>({
  title,
  description,
  data,
  columns,
  emptyMessage = 'Aucun contrôle enregistré',
}: ControlsTableProps<T>) {
  return (
    <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  {columns.map((col) => (
                    <th
                      key={col.key as string}
                      className={cn(
                        'pb-3 font-medium',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/50 transition-colors hover:bg-secondary/50"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key as string}
                        className={cn(
                          'py-3',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        )}
                      >
                        {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key as string] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
