import {
  buildDefaultCustomerPermissions,
  type CustomerPermissions,
} from '../platform-structure';
import type { Employee } from '../store';
import {
  extractCollectionItems,
  isRecord,
  normalizeActiveStatus,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';
import { readPermissionsFromSources } from './permission-mapper';

export const mapEmployeeRecord = (
  record: UnknownRecord,
  fallbackPermissions?: CustomerPermissions,
): Employee | null => {
  const id = readStringValue(record, ['id', 'employee_id', 'user_id', 'staff_id']);
  const name = readStringValue(record, ['name', 'employee_name', 'full_name', 'fullName']);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    phone: readStringValue(record, ['phone', 'mobile', 'mobile_no', 'phone_number']) || 'Not added',
    email: readStringValue(record, ['email', 'employee_email', 'user_email', 'username']) || '',
    permissions: readPermissionsFromSources(record) || fallbackPermissions || buildDefaultCustomerPermissions(),
    departmentId: readStringValue(record, ['department_id', 'departmentId', 'counter_id', 'counterId']) || undefined,
    status: normalizeActiveStatus(readStringValue(record, ['status', 'is_active'])),
    joinedDate: readStringValue(record, ['joined_date', 'joinedDate', 'created_at', 'createdAt', 'date']) || undefined,
  };
};

export const mapEmployeesResponse = (payload: unknown, fallbackPermissions?: CustomerPermissions) => {
  return extractCollectionItems(payload, ['data', 'employees', 'items', 'rows', 'records']).reduce<Employee[]>((employees, entry) => {
    if (!isRecord(entry)) {
      return employees;
    }

    const mappedEmployee = mapEmployeeRecord(entry, fallbackPermissions);
    if (mappedEmployee) {
      employees.push(mappedEmployee);
    }

    return employees;
  }, []);
};
