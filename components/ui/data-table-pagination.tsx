"use client";

import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DataTablePaginationProps<TData> = {
  table: Table<TData>;
  totalRows?: number;
  pageSizeOptions?: number[];
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
};

export function DataTablePagination<TData>({
  table,
  totalRows,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const rowTotal =
    totalRows ??
    (table.options.manualPagination
      ? table.getRowCount()
      : table.getFilteredRowModel().rows.length);

  const showPageSize =
    Boolean(onPageSizeChange) || !table.options.manualPagination;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-3",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        {rowTotal} row{rowTotal === 1 ? "" : "s"}
        {pageCount > 0 ? (
          <>
            &nbsp; · page {pageIndex + 1} of {pageCount}
          </>
        ) : null}
      </p>

      <div className="flex items-center gap-2">
        {showPageSize ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const nextSize = Number(value);
                if (onPageSizeChange) {
                  onPageSizeChange(nextSize);
                  return;
                }
                table.setPageSize(nextSize);
                table.setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!table.getCanPreviousPage()}
          onClick={() => {
            const nextIndex = pageIndex - 1;
            if (onPageChange) {
              onPageChange(nextIndex);
              return;
            }
            table.previousPage();
          }}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!table.getCanNextPage()}
          onClick={() => {
            const nextIndex = pageIndex + 1;
            if (onPageChange) {
              onPageChange(nextIndex);
              return;
            }
            table.nextPage();
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
