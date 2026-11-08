/**
 * Proof that the customer's photos passed the car check (`/api/v1/vehicles/detect`). It lives in
 * sessionStorage and is sent with every render request; the server only requires it when
 * CAR_CHECK_SECRET is configured (see src/server/car-check.ts).
 */
const KEY = 'carvision_car_check_token';

export function setCarCheckToken(token: string | null | undefined): void {
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked: the render then runs without a token (only matters when enforcement is on)
  }
}

export function getCarCheckToken(): string | undefined {
  try {
    return sessionStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
