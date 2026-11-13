'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, HelpCircle, X } from 'lucide-react';
import { InfoTip } from '@/components/ui/InfoTip';
import { PLUS_SIZE_MAX, wheelFit, type CheckState } from '@/domain/car-fit';
import { useMyCar } from './useMyCar';

const ICON: Record<CheckState, { Icon: typeof Check; tone: string }> = {
  ok: { Icon: Check, tone: 'text-emerald-300' },
  warn: { Icon: AlertTriangle, tone: 'text-amber-300' },
  bad: { Icon: X, tone: 'text-red-300' },
  unknown: { Icon: HelpCircle, tone: 'text-white/45' },
};

function Row({ state, title, body }: { state: CheckState; title: string; body: string }) {
  const { Icon, tone } = ICON[state];
  return (
    <li className="flex gap-2.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} strokeWidth={2.4} />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-white/60">{body}</span>
      </span>
    </li>
  );
}

/**
 * The "i" beside a wheel's sizes: how this wheel compares with the factory wheel of the customer's
 * car — bolt pattern (PCD), rim diameter and offset (ET) — in plain words.
 */
export function WheelFitTip({ attributes }: { attributes: Record<string, unknown> | undefined }) {
  const t = useTranslations('shop.detail.wheelFit');
  const { car } = useMyCar();
  const r = wheelFit(attributes, car);
  const f = r.factory;

  const pcdBody =
    r.pcd.state === 'ok'
      ? t('pcdOk', { pcd: r.pcd.value ?? '' })
      : r.pcd.state === 'bad'
        ? t('pcdBad', { pcd: r.pcd.value ?? '', factory: f?.pcd ?? '' })
        : t('pcdExplain');

  const factoryDia = f ? (f.diameter[0] === f.diameter[1] ? `R${f.diameter[0]}` : `R${f.diameter[0]}–R${f.diameter[1]}`) : '';
  const diaBody =
    r.diameter.state === 'ok'
      ? t('diaOk', { factory: factoryDia })
      : r.diameter.state === 'warn' && r.diameter.dir === 'big'
        ? t('diaBig', { factory: factoryDia, plus: PLUS_SIZE_MAX })
        : r.diameter.state === 'warn'
          ? t('diaSmall', { factory: factoryDia })
          : t('diaExplain');

  return (
    <InfoTip label={t('open')}>
      <span className="block text-[14px] font-semibold text-white">{t('title')}</span>
      <span className="mt-1 block text-[12px] leading-snug text-white/55">
        {car ? (f ? t('factoryFor', { car: car.label, pcd: f.pcd, dia: factoryDia }) : t('unknownCar', { car: car.label })) : t('pickCar')}
      </span>
      <ul className="mt-3 space-y-3">
        <Row state={r.pcd.state} title={r.pcd.value ? `PCD ${r.pcd.value}` : 'PCD'} body={pcdBody} />
        <Row state={r.diameter.state} title={r.diameter.value !== null ? t('diameterTitle', { dia: r.diameter.value }) : t('diameterTitleNone')} body={diaBody} />
        <Row state="unknown" title={r.offset.value !== null ? `ET${r.offset.value}` : 'ET'} body={t('offsetExplain')} />
      </ul>
    </InfoTip>
  );
}
