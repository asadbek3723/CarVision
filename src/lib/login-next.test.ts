import { describe, expect, it } from 'vitest';
import { loginHref, safeNext } from './login-next';

describe('safeNext', () => {
  it('keeps a path of this app in the current language', () => {
    expect(safeNext('/uz/cart/checkout?ids=a,b', 'uz')).toBe('/uz/cart/checkout?ids=a,b');
  });

  it('drops other sites, other languages and protocol tricks', () => {
    expect(safeNext('https://evil.example/uz/cart', 'uz')).toBeNull();
    expect(safeNext('//evil.example', 'uz')).toBeNull();
    expect(safeNext('/uz//evil.example', 'uz')).toBeNull();
    expect(safeNext('/uz/\\evil.example', 'uz')).toBeNull();
    expect(safeNext('/ru/cart', 'uz')).toBeNull();
    expect(safeNext('/uzbek/cart', 'uz')).toBeNull();
    expect(safeNext('', 'uz')).toBeNull();
    expect(safeNext(null, 'uz')).toBeNull();
  });

  it('never returns to the sign-in pages themselves', () => {
    expect(safeNext('/uz/login', 'uz')).toBeNull();
    expect(safeNext('/uz/register?x=1', 'uz')).toBeNull();
  });
});

describe('loginHref', () => {
  it('carries a safe return path', () => {
    expect(loginHref('uz', '/uz/customize')).toBe('/uz/login?next=%2Fuz%2Fcustomize');
  });

  it('falls back to the plain login page', () => {
    expect(loginHref('uz', 'https://evil.example')).toBe('/uz/login');
    expect(loginHref('uz')).toBe('/uz/login');
  });
});
