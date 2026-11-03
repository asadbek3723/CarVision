'use client';

import * as React from 'react';
import { useApiError } from '@/lib/api-error';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Check,
  ChevronRight,
  Lock,
  MapPin,
  Search,
  Smartphone,
  Store,
  User,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  AuthShell,
  GlassCard,
  FloatingInput,
  GoldButton,
} from '@/features/auth/components/AuthShell';
import { playLock, vibrate } from '@/features/camera/lib/fx';

interface Country {
  id: string;
  /** Stable value sent to the server — never shown to the user. */
  name: string;
  flag: string;
  code: string;
}

const COUNTRIES: Country[] = [
  { id: 'uzbekistan', name: "O'zbekiston", flag: '🇺🇿', code: '+998' },
  { id: 'kazakhstan', name: "Qozog'iston", flag: '🇰🇿', code: '+7' },
  { id: 'kyrgyzstan', name: "Qirg'iziston", flag: '🇰🇬', code: '+996' },
  { id: 'tajikistan', name: 'Tojikiston', flag: '🇹🇯', code: '+992' },
  { id: 'turkmenistan', name: 'Turkmaniston', flag: '🇹🇲', code: '+993' },
  { id: 'russia', name: 'Rossiya', flag: '🇷🇺', code: '+7' },
  { id: 'turkey', name: 'Turkiya', flag: '🇹🇷', code: '+90' },
  { id: 'uae', name: 'BAA', flag: '🇦🇪', code: '+971' },
  { id: 'germany', name: 'Germaniya', flag: '🇩🇪', code: '+49' },
  { id: 'usa', name: 'AQSH', flag: '🇺🇸', code: '+1' },
  { id: 'uk', name: 'Buyuk Britaniya', flag: '🇬🇧', code: '+44' },
  { id: 'southKorea', name: 'Janubiy Koreya', flag: '🇰🇷', code: '+82' },
];

const STEP_KEYS = [
  ['step1Title', 'step1Sub'],
  ['step2Title', 'step2Sub'],
  ['step3Title', 'step3Sub'],
] as const;

export default function RegisterPage() {
  const t = useTranslations('register');
  const router = useRouter();
  const params = useParams();
  const locale = (params['locale'] as string) || 'uz';
  const { user } = useAuth();

  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [selectedCountry, setSelectedCountry] = React.useState<Country | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<'user' | 'business' | null>(null);
  const [shake, setShake] = React.useState(0);

  // If already authenticated, redirect to the Veloce App
  React.useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        router.push(`/${locale}/admin`);
      } else {
        router.push(`/${locale}/seller`);
      }
    }
  }, [user, locale, router]);

  const goToStep = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleBack = () => {
    if (step === 0 || step === 3) {
      router.push(`/${locale}/login`);
    } else {
      goToStep(step - 1);
    }
  };

  return (
    <AuthShell onBack={handleBack}>
      <GlassCard shake={shake}>
        {step < 3 && (
          <React.Fragment>
            {/* 3-Step Progress Indicator */}
            <div className="mb-4 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-foreground/10"
                >
                  <motion.div
                    className="h-full bg-gold"
                    initial={false}
                    animate={{ width: i <= step ? '100%' : '0%' }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              ))}
            </div>

            {/* Step Header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-center"
              >
                <p className="text-[9px] tracking-[0.45em] text-gold uppercase">
                  {t('stepLabel', { current: step + 1, total: 3 })}
                </p>
                <h2 className="font-display mt-1 text-2xl sm:text-[28px] text-foreground leading-tight">
                  {STEP_KEYS[step] ? t(STEP_KEYS[step][0]) : null}
                </h2>
                <p className="mt-1 text-xs text-foreground/65">
                  {STEP_KEYS[step] ? t(STEP_KEYS[step][1]) : null}
                </p>
              </motion.div>
            </AnimatePresence>
          </React.Fragment>
        )}

        {/* Dynamic Wizard Steps */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step + (selectedRole ?? '')}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5"
          >
            {step === 0 && (
              <CountryPicker
                value={selectedCountry}
                onPick={(c) => {
                  setSelectedCountry(c);
                  setTimeout(() => goToStep(1), 200);
                }}
              />
            )}

            {step === 1 && (
              <RolePicker
                value={selectedRole}
                onPick={(r) => {
                  setSelectedRole(r);
                  setTimeout(() => goToStep(2), 200);
                }}
              />
            )}

            {step === 2 && selectedCountry && selectedRole && (
              <DetailsForm
                country={selectedCountry}
                role={selectedRole}
                onError={() => setShake((prev) => prev + 1)}
                onDone={() => goToStep(3)}
              />
            )}

            {step === 3 && (
              <SuccessScreen
                role={selectedRole}
                onSignIn={() => router.push(`/${locale}/login`)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {step < 3 && (
          <p className="mt-5 text-center text-xs text-foreground/65">
            {t('haveAccount')}{' '}
            <Link
              href={`/${locale}/login`}
              className="font-medium text-gold hover:brightness-125 ms-1"
            >
              {t('signInLink')}
            </Link>
          </p>
        )}
      </GlassCard>
    </AuthShell>
  );
}

function CountryPicker({
  value,
  onPick,
}: {
  value: Country | null;
  onPick: (country: Country) => void;
}) {
  const t = useTranslations('register');
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(
    () =>
      COUNTRIES.filter((c) =>
        t(`countries.${c.id}`).toLowerCase().includes(query.toLowerCase())
      ),
    [query, t]
  );

  return (
    <div>
      <FloatingInput
        icon={<Search className="h-4 w-4" />}
        placeholder={t('searchCountry')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pe-1">
        {filtered.map((item, idx) => {
          const isSelected = value?.id === item.id;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.025 }}
              onClick={() => onPick(item)}
              className={`flex w-full cursor-pointer items-center gap-3.5 rounded-2xl px-4 py-3 text-start transition ${
                isSelected ? 'bg-[#D4AE62]/15' : 'bg-white/[0.05] hover:bg-white/[0.09]'
              }`}
            >
              <span className="text-xl">{item.flag}</span>
              <span className="flex-1 text-[14px] text-foreground">
                {t(`countries.${item.id}`)}
              </span>
              <span className="text-xs text-foreground/55">{item.code}</span>
              {isSelected ? (
                <Check className="h-4 w-4 text-[#D4AE62]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-foreground/40 rtl:rotate-180" />
              )}
            </motion.button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-foreground/55">
            {t('notFound')}
          </p>
        )}
      </div>
    </div>
  );
}

function RolePicker({
  value,
  onPick,
}: {
  value: 'user' | 'business' | null;
  onPick: (role: 'user' | 'business') => void;
}) {
  const t = useTranslations('register');
  const ROLES = [
    {
      id: 'user' as const,
      icon: User,
      title: t('roleUserTitle'),
      desc: t('roleUserDesc'),
    },
    {
      id: 'business' as const,
      icon: Briefcase,
      title: t('roleBusinessTitle'),
      desc: t('roleBusinessDesc'),
    },
  ];

  return (
    <div className="space-y-3">
      {ROLES.map((item, idx) => {
        const isSelected = value === item.id;
        const IconComponent = item.icon;
        return (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + idx * 0.08 }}
            whileHover={{ y: -2 }}
            onClick={() => onPick(item.id)}
            className={`group flex w-full cursor-pointer items-center gap-4 rounded-3xl p-5 text-start transition ${
              isSelected ? 'bg-[#D4AE62]/15' : 'bg-white/[0.05] hover:bg-white/[0.09]'
            }`}
          >
            <span
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl transition ${
                isSelected ? 'bg-[#D4AE62] text-black' : 'bg-[#D4AE62]/15 text-[#D4AE62]'
              }`}
            >
              <IconComponent className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <span className="flex-1">
              <span className="font-display block text-xl text-foreground">
                {item.title}
              </span>
              <span className="mt-0.5 block text-xs text-foreground/60">
                {item.desc}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-white/40 transition group-hover:translate-x-1 group-hover:text-[#D4AE62] rtl:rotate-180 rtl:group-hover:-translate-x-1" />
          </motion.button>
        );
      })}
    </div>
  );
}

function DetailsForm({
  country,
  role,
  onDone,
  onError,
}: {
  country: Country;
  role: 'user' | 'business';
  onDone: () => void;
  onError: () => void;
}) {
  const t = useTranslations('register');
  const apiError = useApiError();
  const isBusiness = role === 'business';
  const { signUp } = useAuth();
  const [formData, setFormData] = React.useState({
    name: '',
    address: '',
    phone: '',
    pwd: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const updateField =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (formData.name.trim().length < 2) {
      errs['name'] = isBusiness
        ? t('errNameBusiness')
        : t('errNameUser');
    }
    if (isBusiness && formData.address.trim().length < 4) {
      errs['address'] = t('errAddress');
    }
    if (formData.phone.replace(/\D/g, '').length < 7) {
      errs['phone'] = t('errPhone');
    }
    if (formData.pwd.length < 8) {
      errs['pwd'] = t('errPassword');
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      onError();
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = `${country.code} ${formData.phone.trim()}`;
      const res = await signUp({
        identifier: cleanPhone,
        password: formData.pwd,
        role: isBusiness ? 'b2b_seller' : 'b2c_user',
        fullName: formData.name.trim(),
        country: country.name,
        shopName: isBusiness ? formData.name.trim() : undefined,
        city: country.name,
        district: isBusiness ? formData.address.trim() : undefined,
      });

      if (res.success) {
        playLock();
        vibrate(30);
        setTimeout(onDone, 500);
      } else {
        setErrors({
          phone: apiError(res, t('errFailed')),
        });
        onError();
      }
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    <FloatingInput
      key="n"
      icon={
        isBusiness ? (
          <Store className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )
      }
      placeholder={isBusiness ? t('phNameBusiness') : t('phNameUser')}
      value={formData.name}
      onChange={updateField('name')}
      error={errors['name']}
      maxLength={80}
    />,
    isBusiness && (
      <FloatingInput
        key="a"
        icon={<MapPin className="h-4 w-4" />}
        placeholder={t('phAddress')}
        value={formData.address}
        onChange={updateField('address')}
        error={errors['address']}
        maxLength={160}
      />
    ),
    <FloatingInput
      key="p"
      icon={<Smartphone className="h-4 w-4" />}
      prefix={`${country.flag} ${country.code}`}
      placeholder={t('phPhone')}
      inputMode="tel"
      value={formData.phone}
      onChange={updateField('phone')}
      error={errors['phone']}
      maxLength={16}
    />,
    <FloatingInput
      key="w"
      icon={<Lock className="h-4 w-4" />}
      type="password"
      placeholder={t('phPassword')}
      value={formData.pwd}
      onChange={updateField('pwd')}
      error={errors['pwd']}
      maxLength={64}
    />,
  ].filter(Boolean);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {fields.map((field, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 * i }}
        >
          {field}
        </motion.div>
      ))}

      <div className="pt-2">
        <GoldButton type="submit" loading={loading}>
          {t('submit')}
        </GoldButton>
      </div>
    </form>
  );
}

function SuccessScreen({
  role,
  onSignIn,
}: {
  role: 'user' | 'business' | null;
  onSignIn: () => void;
}) {
  const t = useTranslations('register');
  return (
    <div className="flex flex-col items-center py-2 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
        className="gold-btn grid h-16 w-16 place-items-center rounded-full"
      >
        <Check className="relative z-10 h-8 w-8 text-ink" strokeWidth={2.5} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="font-display mt-5 text-3xl text-foreground"
      >
        {t('successTitle')}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-1.5 max-w-xs text-xs text-foreground/70"
      >
        {role === 'business'
          ? t('successBusiness')
          : t('successUser')}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 w-full"
      >
        <GoldButton type="button" onClick={onSignIn}>
          {t('signIn')}
        </GoldButton>
      </motion.div>
    </div>
  );
}
