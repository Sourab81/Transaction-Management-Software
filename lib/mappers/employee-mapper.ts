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
  const fullName = readStringValue(record, ['fullname', 'full_name', 'fullName', 'employee_name', 'name']);
  const nickName = readStringValue(record, ['nickname', 'nick_name', 'nickName', 'display_name', 'displayName']);
  const displayName = nickName || fullName;

  if (!id || !displayName) {
    return null;
  }

  const mobile = readStringValue(record, ['contact_no', 'contactNo', 'mobile', 'mobile_no', 'phone', 'phone_number']) || 'Not added';
  const createDate = readStringValue(record, ['create_date', 'createDate', 'created_at', 'createdAt']) || undefined;
  const updateDate = readStringValue(record, ['update_date', 'updateDate', 'updated_at', 'updatedAt']) || undefined;
  const addedDate = readStringValue(record, ['added_date', 'addedDate', 'date']) || createDate;

  return {
    id,
    name: displayName,
    fullName: fullName || displayName,
    nickName: nickName || displayName,
    displayName,
    phone: mobile,
    mobile,
    email: readStringValue(record, ['email_id', 'email', 'employee_email', 'user_email', 'username']) || '',
    gender: readStringValue(record, ['gender']) || undefined,
    dob: readStringValue(record, ['dob', 'date_of_birth', 'dateOfBirth']) || undefined,
    address: readStringValue(record, ['address']) || undefined,
    remark: readStringValue(record, ['remark', 'remarks', 'note']) || undefined,
    permissions: readPermissionsFromSources(record) || fallbackPermissions || buildDefaultCustomerPermissions(),
    status: normalizeActiveStatus(readStringValue(record, ['status', 'is_active'])),
    joinedDate: addedDate,
    createDate,
    updateDate,
    addedDate,
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
