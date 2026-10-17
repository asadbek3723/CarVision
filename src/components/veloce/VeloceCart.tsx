'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { useVeloceStore } from '@/context/VeloceStore';
import { getProductById, formatPriceUSD, VeloceProduct } from '@/domain/veloce-catalog';

export function VeloceCart() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { cart, add, remove } = useVeloceStore();

  const cartItems = React.useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const prod = getProductById(id);
        if (!prod) return null;
        return { p: prod, q: qty };
      })
      .filter((item): item is { p: VeloceProduct; q: number } => item !== null);
  }, [cart]);

  const subtotal = React.useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.p.price * item.q, 0);
  }, [cartItems]);

  if (!cartItems.length) {
    return (
      <div className="rise mx-auto grid max-w-md place-items-center px-5 pt-24 text-center">
        <ShoppingCart className="h-12 w-12 text-primary" />
        <h1 className="mt-4 font-display text-2xl tracking-[0.2em] text-white">
          CART IS EMPTY
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          You haven't added any tuning parts to your order yet.
        </p>
        <Link
          href={`/${locale}/shop`}
          className="mt-6 rounded-full bg-gold-gradient px-7 py-3 text-xs font-bold tracking-[0.2em] text-black uppercase shadow-gold transition hover:brightness-110 active:scale-95"
        >
          Go to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 pt-8 md:px-10 lg:grid-cols-[1fr_360px]">
      {/* Cart Items List */}
      <div className="space-y-3">
        <h1 className="mb-4 font-display text-2xl tracking-[0.2em] text-white">
          YOUR CART
        </h1>

        {cartItems.map(({ p, q }, idx) => (
          <div
            key={p.id}
            className="rise flex items-center gap-4 rounded-2xl border border-primary/20 bg-card-gradient p-3 shadow-card"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {p.swatch ? (
              <div
                className="h-20 w-20 shrink-0 rounded-xl"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${p.swatch}, oklch(0.08 0 0))`,
                }}
              />
            ) : (
              <img
                src={p.image}
                alt={p.name}
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                {p.brand}
              </p>
              <p className="truncate font-semibold text-white">{p.name}</p>
              <p className="text-gold-gradient text-sm font-bold">
                {formatPriceUSD(p.price)}
              </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 rounded-full border border-primary/20 p-1 bg-card/60">
              <button
                onClick={() => remove(p.id)}
                aria-label="Decrease quantity"
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 transition cursor-pointer text-foreground/80 hover:text-white"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-4 text-center text-sm font-semibold text-white">
                {q}
              </span>
              <button
                onClick={() => add(p.id)}
                aria-label="Increase quantity"
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 transition cursor-pointer text-foreground/80 hover:text-white"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary Aside */}
      <aside className="rise h-fit rounded-3xl border border-primary/40 bg-card-gradient p-6 shadow-gold lg:sticky lg:top-24">
        <h2 className="text-xs tracking-luxe uppercase text-white font-medium">
          Summary
        </h2>

        <div className="mt-5 space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-white font-medium">{formatPriceUSD(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="text-success font-medium">Free</span>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t border-primary/15 pt-4 font-bold text-white">
          <span>Total</span>
          <span className="text-gold-gradient text-xl">
            {formatPriceUSD(subtotal)}
          </span>
        </div>

        <button
          onClick={() => {
            alert(`Buyurtmangiz qabul qilindi! Jami: ${formatPriceUSD(subtotal)}`);
          }}
          className="shimmer mt-6 w-full rounded-full bg-gold-gradient py-4 text-xs font-bold tracking-[0.25em] text-black uppercase shadow-gold transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
        >
          Checkout
        </button>
      </aside>
    </div>
  );
}
