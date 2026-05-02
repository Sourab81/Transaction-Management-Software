const readTrimmedStringFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

const readRawStringFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
};

export const readLoginFormValues = (formData: FormData) => ({
  email: readTrimmedStringFormValue(formData, 'email').toLowerCase(),
  password: readRawStringFormValue(formData, 'password'),
});
