"use client";

import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number; // 0-indexed
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageCount, onChange, className = "" }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <Button
        color="white"
        onClick={() => onChange(page - 1)}
        disabled={page <= 0}
      >
        ← Sebelumnya
      </Button>
      <span className="nb-badge nb-mustard">
        {page + 1} / {pageCount}
      </span>
      <Button
        color="white"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount - 1}
      >
        Selanjutnya →
      </Button>
    </div>
  );
}
