'use client';

import React, { useState } from 'react';
import { FaFilter, FaSearch, FaTimes } from 'react-icons/fa';

export type DataTableFilterOptionValue = string | number | boolean;

export interface DataTableFilterOption {
  label: string;
  value: DataTableFilterOptionValue;
}

export interface DataTableSearchFilterConfig {
  enabled: boolean;
  fields: string[];
  label: string;
}

export interface DataTableMultiSelectFilterConfig {
  field: string;
  label: string;
  type: 'multi-select';
  options: DataTableFilterOption[];
}

export interface DataTableSingleSelectFilterConfig {
  field: string;
  label: string;
  type: 'single-select';
  options: DataTableFilterOption[];
}

export interface DataTableDateRangeFilterConfig {
  field: string;
  label: string;
  type: 'date-range';
}

export type DataTableFilterFieldConfig =
  | DataTableMultiSelectFilterConfig
  | DataTableSingleSelectFilterConfig
  | DataTableDateRangeFilterConfig;

export interface DataTableFiltersConfig {
  search: DataTableSearchFilterConfig;
  fields: DataTableFilterFieldConfig[];
}

export interface DataTableDateRangeValue {
  from: string;
  to: string;
}

export type DataTableFilterFieldValue = DataTableFilterOptionValue[] | DataTableFilterOptionValue | '' | DataTableDateRangeValue;

export interface DataTableFiltersValue {
  search: string;
  fields: Record<string, DataTableFilterFieldValue | undefined>;
}

interface DataTableFiltersProps {
  filters: DataTableFiltersConfig;
  value: DataTableFiltersValue;
  onChange: (value: DataTableFiltersValue) => void;
  eyebrow?: string;
  title?: string;
  copy?: string;
  resultLabel?: string;
  showHeader?: boolean;
  showFooterHint?: boolean;
  className?: string;
}

export const buildEmptyDataTableFiltersValue = (filters: DataTableFiltersConfig): DataTableFiltersValue => ({
  search: '',
  fields: Object.fromEntries(
    filters.fields.map((field) => [
      field.field,
      field.type === 'date-range' ? { from: '', to: '' } : field.type === 'single-select' ? '' : [],
    ])
  ),
});

export const readDataTableMultiSelectFilter = (
  value: DataTableFiltersValue,
  field: string,
): DataTableFilterOptionValue[] => {
  const fieldValue = value.fields[field];
  return Array.isArray(fieldValue) ? fieldValue : [];
};

export const readDataTableDateRangeFilter = (
  value: DataTableFiltersValue,
  field: string,
): DataTableDateRangeValue => {
  const fieldValue = value.fields[field];

  if (fieldValue && !Array.isArray(fieldValue) && typeof fieldValue === 'object') {
    return fieldValue;
  }

  return { from: '', to: '' };
};

export const readDataTableSingleSelectFilter = (
  value: DataTableFiltersValue,
  field: string,
): DataTableFilterOptionValue | '' => {
  const fieldValue = value.fields[field];
  return typeof fieldValue === 'string' || typeof fieldValue === 'number' || typeof fieldValue === 'boolean'
    ? fieldValue
    : '';
};

const hasActiveFilterValue = (fieldValue: DataTableFilterFieldValue | undefined) => {
  if (Array.isArray(fieldValue)) {
    return fieldValue.length > 0;
  }

  if (fieldValue && typeof fieldValue === 'object') {
    return Boolean(fieldValue.from || fieldValue.to);
  }

  return fieldValue !== '' && typeof fieldValue !== 'undefined';
};

const isOptionSelected = (
  selectedValues: DataTableFilterOptionValue[],
  optionValue: DataTableFilterOptionValue,
) => selectedValues.some((selectedValue) => Object.is(selectedValue, optionValue));

export default function DataTableFilters({
  filters,
  value,
  onChange,
  eyebrow = 'Filters',
  title = 'Filter records',
  copy = 'Narrow the table by the available fields.',
  resultLabel,
  showHeader = true,
  showFooterHint = true,
  className = '',
}: DataTableFiltersProps) {
  const [openDropdownField, setOpenDropdownField] = useState<string | null>(null);
  const activeFilterCount = [
    value.search.trim() ? 1 : 0,
    ...filters.fields.map((field) => hasActiveFilterValue(value.fields[field.field]) ? 1 : 0),
  ].reduce((total, count) => total + count, 0);
  const hasActiveFilters = activeFilterCount > 0;

  const updateSearch = (nextSearch: string) => {
    onChange({
      ...value,
      search: nextSearch,
    });
  };

  const updateField = (field: string, fieldValue: DataTableFilterFieldValue) => {
    onChange({
      ...value,
      fields: {
        ...value.fields,
        [field]: fieldValue,
      },
    });
  };

  const toggleMultiSelectValue = (
    field: string,
    optionValue: DataTableFilterOptionValue,
  ) => {
    const selectedValues = readDataTableMultiSelectFilter(value, field);
    const nextValues = isOptionSelected(selectedValues, optionValue)
      ? selectedValues.filter((selectedValue) => !Object.is(selectedValue, optionValue))
      : [...selectedValues, optionValue];

    updateField(field, nextValues);
  };

  const updateSingleSelectValue = (
    field: DataTableSingleSelectFilterConfig,
    nextValue: string,
  ) => {
    const selectedOption = field.options.find((option) => String(option.value) === nextValue);
    updateField(field.field, selectedOption?.value ?? '');
  };

  const updateDateRange = (
    field: string,
    key: keyof DataTableDateRangeValue,
    fieldValue: string,
  ) => {
    updateField(field, {
      ...readDataTableDateRangeFilter(value, field),
      [key]: fieldValue,
    });
  };

  return (
    <section className={`table-filter-panel ${className}`}>
      {showHeader ? (
        <div className="table-filter-panel__header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="panel-title">{title}</h2>
            <p className="panel-copy">{copy}</p>
          </div>
          <div className="table-filter-panel__meta">
            {resultLabel ? <span className="panel-status-chip">{resultLabel}</span> : null}
            <span className="status-chip status-chip--info">
              {activeFilterCount} active
            </span>
          </div>
        </div>
      ) : null}

      <div className="table-filter-grid">
        {filters.search.enabled ? (
          <div className="app-field table-filter-search">
            <label className="form-label">{filters.search.label || 'Search'}</label>
            <div className="table-filter-search__control">
              <FaSearch className="table-filter-search__icon" aria-hidden="true" />
              <input
                className="form-control"
                type="search"
                value={value.search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder={filters.search.fields.length > 0
                  ? `Search ${filters.search.fields.join(', ')}`
                  : 'Search records'}
              />
            </div>
          </div>
        ) : null}

        {filters.fields.map((field) => {
          if (field.type === 'date-range') {
            const rangeValue = readDataTableDateRangeFilter(value, field.field);

            return (
              <div key={field.field} className="app-field table-filter-field table-filter-field--date">
                <label className="form-label">{field.label}</label>
                <div className="table-filter-date-range">
                  <input
                    className="form-control"
                    type="date"
                    aria-label={`${field.label} from`}
                    value={rangeValue.from}
                    onChange={(event) => updateDateRange(field.field, 'from', event.target.value)}
                  />
                  <input
                    className="form-control"
                    type="date"
                    aria-label={`${field.label} to`}
                    value={rangeValue.to}
                    onChange={(event) => updateDateRange(field.field, 'to', event.target.value)}
                  />
                </div>
              </div>
            );
          }

          if (field.type === 'single-select') {
            const selectedValue = readDataTableSingleSelectFilter(value, field.field);

            return (
              <div key={field.field} className="app-field table-filter-field table-filter-field--single">
                <label className="form-label">{field.label}</label>
                <select
                  className="form-select"
                  value={String(selectedValue)}
                  onChange={(event) => updateSingleSelectValue(field, event.target.value)}
                >
                  <option value="">All {field.label}</option>
                  {field.options.map((option) => (
                    <option key={`${field.field}-${String(option.value)}`} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          const selectedValues = readDataTableMultiSelectFilter(value, field.field);
          const isDropdownOpen = openDropdownField === field.field;

          return (
            <div key={field.field} className="app-field table-filter-field table-filter-field--multi">
              <label className="form-label">{field.label}</label>
              <div className="table-filter-dropdown">
                <button
                  type="button"
                  className="form-select table-filter-dropdown__button"
                  aria-expanded={isDropdownOpen}
                  onClick={() => setOpenDropdownField((current) => current === field.field ? null : field.field)}
                >
                  <span>{selectedValues.length > 0 ? `${selectedValues.length} selected` : `All ${field.label}`}</span>
                </button>
                {isDropdownOpen ? (
                  <div className="table-filter-options table-filter-dropdown__menu">
                    {field.options.map((option) => (
                      <label
                        key={`${field.field}-${String(option.value)}`}
                        className="table-filter-option"
                      >
                        <input
                          type="checkbox"
                          checked={isOptionSelected(selectedValues, option.value)}
                          onChange={() => toggleMultiSelectValue(field.field, option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        <div className={`table-filter-actions ${showFooterHint ? '' : 'table-filter-actions--compact'}`}>
          <button
            type="button"
            className="btn-app btn-app-secondary"
            disabled={!hasActiveFilters}
            onClick={() => onChange(buildEmptyDataTableFiltersValue(filters))}
          >
            <FaTimes />
            Clear
          </button>
          {showFooterHint ? (
            <span className="table-filter-actions__hint">
              <FaFilter aria-hidden="true" />
              Filters apply to the current table.
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
