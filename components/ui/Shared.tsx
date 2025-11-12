import React, { ReactNode, useState, useMemo } from 'react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon } from '../icons';

// Card
interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}
export const Card: React.FC<CardProps> = ({ children, className, title }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 card ${className}`}>
    {title && <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>}
    {children}
  </div>
);

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center border border-transparent font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantClasses = {
      primary: 'text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
      secondary: 'text-primary-700 bg-primary-100 hover:bg-primary-200 focus:ring-primary-500',
      danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
    };
    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    return (
      <button ref={ref} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);

// Input & Label
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelClassName?: string;
}
export const Input: React.FC<InputProps> = ({ label, id, labelClassName, className, ...props }) => (
  <div>
    {label && <label htmlFor={id} className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName || ''}`}>{label}</label>}
    <input id={id} className={`appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${className || ''}`} {...props} />
  </div>
);

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    children: ReactNode;
    labelClassName?: string;
}
export const Select: React.FC<SelectProps> = ({ label, id, children, labelClassName, className, ...props }) => (
    <div>
        {label && <label htmlFor={id} className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName || ''}`}>{label}</label>}
        <select id={id} className={`block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md ${className || ''}`} {...props}>
            {children}
        </select>
    </div>
);

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  labelClassName?: string;
}
export const Textarea: React.FC<TextareaProps> = ({ label, id, labelClassName, className, ...props }) => (
  <div>
    <label htmlFor={id} className={`block text-sm font-medium text-gray-700 ${labelClassName || ''}`}>{label}</label>
    <div className="mt-1">
      <textarea id={id} className={`appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${className || ''}`} {...props} />
    </div>
  </div>
);


// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className, contentClassName }) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-start justify-center py-10 px-4 ${className || ''}`}>
      <div className={`relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white ${contentClassName || ''}`}>
        <div className="flex justify-between items-center pb-3 border-b no-print">
          <p className="text-2xl font-serif font-black text-gray-800">{title}</p>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200">
            <XMarkIcon />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};

// Sorting Hook and Component
export type SortDirection = 'ascending' | 'descending';
export interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export const useSortableData = <T,>(
  items: T[],
  config: SortConfig<T> | null = null
) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        // Type-aware comparison
        if (aValue instanceof Date && bValue instanceof Date) {
            if (aValue.getTime() < bValue.getTime()) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue.getTime() > bValue.getTime()) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortConfig.direction === 'ascending'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        // Default to number comparison
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: keyof T) => {
    let direction: SortDirection = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

interface SortableHeaderProps<T> {
    sortKey: keyof T;
    title: string;
    requestSort: (key: keyof T) => void;
    sortConfig: SortConfig<T> | null;
    className?: string;
    textAlignment?: 'left' | 'right' | 'center';
}

export const SortableHeader = <T,>({ sortKey, title, requestSort, sortConfig, className, textAlignment = 'left' }: SortableHeaderProps<T>) => {
    const isSorted = sortConfig?.key === sortKey;
    const direction = sortConfig?.direction;

    const getSortIcon = () => {
        if (!isSorted) {
            return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
        }
        if (direction === 'ascending') {
            return <ChevronUpIcon className="w-4 h-4" />;
        }
        return <ChevronDownIcon className="w-4 h-4" />;
    };

    const alignmentClass = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end'
    }[textAlignment];

    return (
        <th 
            className={`px-6 py-3 text-${textAlignment} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className || ''}`}
            onClick={() => requestSort(sortKey)}
        >
            <div className={`flex items-center gap-2 ${alignmentClass}`}>
                <span>{title}</span>
                {getSortIcon()}
            </div>
        </th>
    );
};