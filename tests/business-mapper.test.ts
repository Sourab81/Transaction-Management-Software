import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  mapBusinessesPageResponse,
  mapBusinessesResponse,
} from '../lib/mappers/business-mapper';

describe('business mapper', () => {
  test('maps backend user-list business records and excludes admin users', () => {
    const businesses = mapBusinessesResponse({
      status: 200,
      message: 'User list fetched successfully.',
      data: [
        {
          id: 3,
          fullname: 'New Business Name',
          username: 'newbusiness@example.test',
          email_id: 'newbusiness@example.test',
          contact_no: 9999999999,
          user_type: 'Business',
          role: 2,
          status: 'Active',
          create_date: '2026-04-25 12:24:47',
        },
        {
          id: 2,
          fullname: 'Admin',
          username: 'admin@example.test',
          email_id: 'admin@example.test',
          contact_no: 8888888888,
          user_type: 'Admin',
          role: 1,
          status: 'Active',
          create_date: null,
        },
      ],
    });

    assert.equal(businesses.length, 1);
    assert.deepEqual(
      {
        id: businesses[0]?.id,
        name: businesses[0]?.name,
        phone: businesses[0]?.phone,
        email: businesses[0]?.email,
        status: businesses[0]?.status,
        joinedDate: businesses[0]?.joinedDate,
      },
      {
        id: '3',
        name: 'New Business Name',
        phone: '9999999999',
        email: 'newbusiness@example.test',
        status: 'Active',
        joinedDate: '2026-04-25 12:24:47',
      },
    );
  });

  test('maps backend pagination for the admin business directory', () => {
    const page = mapBusinessesPageResponse(
      {
        status: 200,
        message: 'User list fetched successfully.',
        data: [
          {
            id: 11,
            fullname: 'Page Two Business',
            username: 'page-two-business@example.test',
            email_id: 'page-two-business@example.test',
            contact_no: 7777777777,
            user_type: 'Business',
            role: 2,
            status: 'Active',
            create_date: '2026-04-25 12:24:47',
          },
          {
            id: 12,
            fullname: 'Platform Admin',
            username: 'platform-admin@example.test',
            email_id: 'platform-admin@example.test',
            contact_no: 6666666666,
            user_type: 'Admin',
            role: 1,
            status: 'Active',
          },
        ],
        pagination: {
          total_records: 21,
          current_page: 2,
          total_pages: 3,
          limit: 10,
        },
      },
      2,
      10,
    );

    assert.equal(page.businesses.length, 1);
    assert.equal(page.businesses[0]?.id, '11');
    assert.deepEqual(page.pagination, {
      totalRecords: 21,
      currentPage: 2,
      totalPages: 3,
      limit: 10,
    });
  });
});
