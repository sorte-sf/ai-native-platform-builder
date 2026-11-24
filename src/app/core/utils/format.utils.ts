export function money(value: any) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

export function shortDateTime(value: any) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? '') : new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function reservationErrorMessage(error: any, translate: (key: string) => string) {
  if (error?.status === 0) {
    return translate('errors.backendUnavailable');
  }

  if (error?.status === 401 || error?.status === 403) {
    return translate('errors.createReservationUnauthorized');
  }

  if (error?.status === 409) {
    return typeof error.error === 'string' ? error.error : translate('errors.roomAlreadyReserved');
  }

  if (error?.status === 400) {
    return typeof error.error === 'string' ? error.error : translate('errors.invalidReservation');
  }

  if (error?.error?.title) {
    return error.error.title;
  }

  const message = translate('errors.saveReservation');
  return error?.status ? `${message} (${error.status})` : message;
}
