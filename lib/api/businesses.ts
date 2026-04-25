import { requestAppApi } from './app-client';

export const getBusinessesResponse = (page = 1, limit = 10) => {
  const searchParams = new URLSearchParams({
    page_no: String(page),
    limit: String(limit),
  });

  return requestAppApi(`/api/businesses?${searchParams.toString()}`);
};
