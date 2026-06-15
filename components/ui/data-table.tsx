"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type TableOptions,
  type Table as TanstackTable,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTableProps<TData> = {
  table: TanstackTable<TData>;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  stickyHeader?: boolean;
  fillHeight?: boolean;
};

export function DataTable<TData>({
  table,
  emptyMessage = "No results.",
  className,
  tableClassName,
  stickyHeader = true,
  fillHeight = true,
}: DataTableProps<TData>) {
  const columnCount = table.getAllColumns().length;

  return (
    <div
      className={cn(
        "relative w-full overflow-auto",
        fillHeight && "min-h-0 flex-1",
        className,
      )}
    >
      <Table noContainer className={tableClassName}>
        <TableHeader
          className={cn(
            stickyHeader &&
              "sticky top-0 z-10 bg-card [&_th]:bg-card [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]",
          )}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="px-3 text-xs font-semibold uppercase tracking-wide"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className="align-top"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="px-3 py-3 whitespace-normal"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export type { ColumnDef, TableOptions };
export { flexRender, getCoreRowModel, useReactTable };
