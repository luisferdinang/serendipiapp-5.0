
import React from 'react';
import { Button } from './Button';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  itemsPerPageOptions?: number[];
  onItemsPerPageChange?: (newItemsPerPage: number) => void;
  showItemsPerPageSelector?: boolean;
}

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  itemsPerPageOptions = [10, 25, 50, 100],
  onItemsPerPageChange,
  showItemsPerPageSelector = false,
}) => {
  if (totalPages <= 1 && !showItemsPerPageSelector) {
    return null; // Don't render pagination if there's only one page or less and no selector
  }

  const pageNumbers = [];
  const maxPageButtons = 5; // Max number of page buttons to show (excluding prev/next)

  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const renderPageInfo = () => {
    if (!itemsPerPage || !totalItems || totalItems === 0) return null;
    const firstItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const lastItem = Math.min(currentPage * itemsPerPage, totalItems);
    return (
      <span className="text-sm text-slate-400">
        Mostrando {firstItem}-{lastItem} de {totalItems}
      </span>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 py-3 border-t border-slate-700">
      <div className="mb-2 sm:mb-0">
        {renderPageInfo()}
      </div>
      
      <div className="flex items-center space-x-1">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="secondary"
          size="sm"
          aria-label="Página anterior"
        >
          <ChevronLeftIcon />
          <span className="hidden sm:inline ml-1">Anterior</span>
        </Button>

        {startPage > 1 && (
          <>
            <Button onClick={() => onPageChange(1)} variant="ghost" size="sm">1</Button>
            {startPage > 2 && <span className="text-slate-400 px-2">...</span>}
          </>
        )}

        {pageNumbers.map(number => (
          <Button
            key={number}
            onClick={() => onPageChange(number)}
            variant={currentPage === number ? 'primary' : 'ghost'}
            size="sm"
            aria-current={currentPage === number ? 'page' : undefined}
          >
            {number}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-slate-400 px-2">...</span>}
            <Button onClick={() => onPageChange(totalPages)} variant="ghost" size="sm">{totalPages}</Button>
          </>
        )}

        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          variant="secondary"
          size="sm"
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline mr-1">Siguiente</span>
          <ChevronRightIcon />
        </Button>
      </div>
      {showItemsPerPageSelector && onItemsPerPageChange && itemsPerPage && (
        <div className="mt-4 sm:mt-0 sm:ml-4">
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200 focus:ring-sky-500 focus:border-sky-500"
            aria-label="Transacciones por página"
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>
                {option} por página
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
