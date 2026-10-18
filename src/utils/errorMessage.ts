type ErrorWithResponse = {
  message?: string;
  info?: { message?: string };
  response?: { data?: { message?: string } };
};

export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const value = error as ErrorWithResponse;
    return (
      value.info?.message ||
      value.response?.data?.message ||
      value.message ||
      fallback
    );
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
