'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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
  name: string;
  flag: string;
  code: string;
}

const COUNTRIES: Country[] = [
  { name: "O'zbekiston", flag: '🇺🇿', code: '+998' },
  { name: "Qozog'iston", flag: '🇰🇿', code: '+7' },
  { name: "Qirg'iziston", flag: '🇰🇬', code: '+996' },
  { name: 'Tojikiston', flag: '🇹🇯', code: '+992' },
  { name: 'Turkmaniston', flag: '🇹🇲', code: '+993' },
  { name: 'Rossiya', flag: '🇷🇺', code: '+7' },
  { name: 'Turkiya', flag: '🇹🇷', code: '+90' },
  { name: 'BAA', flag: '🇦🇪', code: '+971' },
  { name: 'Germaniya', flag: '🇩🇪', code: '+49' },
  { name: 'AQSH', flag: '🇺🇸', code: '+1' },
  { name: 'Buyuk Britaniya', flag: '🇬🇧', code: '+44' },
  { name: 'Janubiy Koreya', flag: '🇰🇷', code: '+82' },
];

const STEP_TITLES = [
  ['Davlatingiz', 'Qaysi davlatdansiz?'],
  ['Hisob turi', "O'zingizga mosini tanlang"],
  ["Ma'lumotlar", 'Hisobingizni yarating'],
];

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params['locale'] as string) || 'uz';
  const { user } = useAuth();

  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [selectedCountry, setSelectedCountry] = React.useState<Country | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<'user' | 'business' | null>(null);
  const [shake, setShake] = React.useState(0);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        router.push(`/${locale}/admin`);
      } else {
        router.push(`/${locale}`);
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
                  QADAM {step + 1} / 3
                </p>
                <h2 className="font-display mt-1 text-2xl sm:text-[28px] text-foreground leading-tight">
                  {STEP_TITLES[step]?.[0]}
                </h2>
                <p className="mt-1 text-xs text-foreground/65">
                  {STEP_TITLES[step]?.[1]}
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
            Hisobingiz bormi?{' '}
            <Link
              href={`/${locale}/login`}
              className="font-medium text-gold hover:brightness-125 ms-1"
            >
              Sign In
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
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(
    () =>
      COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  return (
    <div>
      <FloatingInput
        icon={<Search className="h-4 w-4" />}
        placeholder="Davlatni qidiring"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pe-1">
        {filtered.map((item, idx) => {
          const isSelected = value?.name === item.name;
          return (
            <motion.button
              key={item.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.025 }}
              onClick={() => onPick(item)}
              className={`flex w-full items-center gap-3.5 rounded-xl border px-3.5 py-2.5 text-start transition cursor-pointer ${
                isSelected
                  ? 'border-gold bg-gold/10'
                  : 'border-foreground/10 bg-ink/40 hover:border-gold/50 hover:bg-gold/5'
              }`}
            >
              <span className="text-xl">{item.flag}</span>
              <span className="flex-1 text-[14px] text-foreground">
                {item.name}
              </span>
              <span className="text-xs text-foreground/55">{item.code}</span>
              {isSelected ? (
                <Check className="h-3.5 w-3.5 text-gold" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-foreground/40 rtl:rotate-180" />
              )}
            </motion.button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-foreground/55">
            Topilmadi
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
  const ROLES = [
    {
      id: 'user' as const,
      icon: User,
      title: 'Oddiy foydalanuvchi',
      desc: 'Xizmatlarni toping va band qiling',
    },
    {
      id: 'business' as const,
      icon: Briefcase,
      title: 'Biznes egasi',
      desc: 'Auto tuning servisingizni joylang',
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
            className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-start transition cursor-pointer ${
              isSelected
                ? 'border-gold bg-gold/10 shadow-[var(--shadow-gold)]'
                : 'border-foreground/10 bg-ink/40 hover:border-gold/50'
            }`}
          >
            <span
              className={`grid h-12 w-12 place-items-center rounded-xl border transition ${
                isSelected
                  ? 'border-gold bg-gold text-ink'
                  : 'border-gold/30 text-gold group-hover:bg-gold/10'
              }`}
            >
              <IconComponent className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="font-display block text-xl text-foreground">
                {item.title}
              </span>
              <span className="mt-0.5 block text-xs text-foreground/60">
                {item.desc}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-foreground/40 transition group-hover:translate-x-1 rtl:group-hover:-translate-x-1 group-hover:text-gold rtl:rotate-180" />
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
        ? 'Servis nomini kiriting'
        : 'Ismingizni kiriting';
    }
    if (isBusiness && formData.address.trim().length < 4) {
      errs['address'] = 'Manzilni kiriting';
    }
    if (formData.phone.replace(/\D/g, '').length < 7) {
      errs['phone'] = "Telefon raqamini to'g'ri kiriting";
    }
    if (formData.pwd.length < 8) {
      errs['pwd'] = "Parol kamida 8 belgi bo'lishi kerak";
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
          phone: res.error || "Ro'yxatdan o'tishda xatolik yuz berdi",
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
      placeholder={isBusiness ? 'Auto tuning servis nomi' : 'Ismingiz'}
      value={formData.name}
      onChange={updateField('name')}
      error={errors['name']}
      maxLength={80}
    />,
    isBusiness && (
      <FloatingInput
        key="a"
        icon={<MapPin className="h-4 w-4" />}
        placeholder="Servis manzili"
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
      placeholder="Telefon raqam"
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
      placeholder="Parol yarating"
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
          CREATE ACCOUNT
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
        Xush kelibsiz
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-1.5 max-w-xs text-xs text-foreground/70"
      >
        {role === 'business'
          ? "Servisingiz muvaffaqiyatli ro'yxatdan o'tdi."
          : "Hisobingiz muvaffaqiyatli yaratildi."}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 w-full"
      >
        <GoldButton type="button" onClick={onSignIn}>
          SIGN IN
        </GoldButton>
      </motion.div>
    </div>
  );
}
