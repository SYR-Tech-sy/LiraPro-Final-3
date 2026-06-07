import React, { useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Utility: star/seal polygon path ───────────────────────────────────── */
function sealPath(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    parts.push(`${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(angle)).toFixed(3)},${(cy + r * Math.sin(angle)).toFixed(3)}`);
  }
  return parts.join(' ') + 'Z';
}

/* ══════════════════════════════════════════════════════════════════════════
   BlueBadge — blue / cyan (مستخدم عادي موثّق)
   Pulse Soft · Floating · Glow Breathing · Shine Sweep · Orbit Ring · Hover
══════════════════════════════════════════════════════════════════════════ */
export const BlueBadge = React.memo(function BlueBadge({ size = 20 }: { size?: number; showGlow?: boolean }) {
  const uid = useId().replace(/:/g, 'x');
  const cx = 50; const cy = 50;
  const seal = sealPath(cx, cy, 40, 33.5, 12);
  return (
    <motion.span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'hidden' }} aria-label="موثّق">
        <defs>
          <radialGradient id={`bg1${uid}`} cx="30%" cy="25%" r="70%">
            <stop offset="0%"   stopColor="#DBEAFE" />
            <stop offset="25%"  stopColor="#60A5FA" />
            <stop offset="55%"  stopColor="#2563EB" />
            <stop offset="80%"  stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </radialGradient>
          <linearGradient id={`bsh${uid}`} x1="0%" y1="0%" x2="100%" y2="15%">
            <stop offset="0%"   stopColor="white" stopOpacity="0" />
            <stop offset="25%"  stopColor="white" stopOpacity="0" />
            <stop offset="42%"  stopColor="white" stopOpacity="0.55" />
            <stop offset="50%"  stopColor="white" stopOpacity="0.60" />
            <stop offset="58%"  stopColor="white" stopOpacity="0.55" />
            <stop offset="75%"  stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`bclip${uid}`}><path d={seal} /></clipPath>
        </defs>

        <path d={seal} fill={`url(#bg1${uid})`} />
        <circle cx={cx} cy={cy} r={22} fill="#FFFFFF" />
        <path d="M 37,51 L 45.5,60 L 64,40" fill="none" stroke="#2563EB"
          strokeWidth={5.2} strokeLinecap="round" strokeLinejoin="round" />

        <g clipPath={`url(#bclip${uid})`}>
          <motion.rect
            x={-40} y={0} width={35} height={100}
            fill={`url(#bsh${uid})`}
            animate={{ x: [-40, 120] }}
            transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.4 }}
          />
        </g>
      </svg>
    </motion.span>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   GoldenBadge — gold / amber (مزود أسعار / شركة موثوقة)
   Dynamic Energy · Golden Sparks · Glow Burst · Multi Layer · Scan Line · Hover
══════════════════════════════════════════════════════════════════════════ */
export const GoldenBadge = React.memo(function GoldenBadge({ size = 20, showGlow = true }: { size?: number; showGlow?: boolean }) {
  const uid = useId().replace(/:/g, 'x');
  const [hovered, setHovered] = useState(false);
  const cx = 50; const cy = 50;
  const seal = sealPath(cx, cy, 42, 34.5, 16);

  /* 6 gold orbit rings — mirror of Cyberpunk/Legendary ring style */
  const GOLD_RINGS = [
    { color: '#FFD700', angle: 0,   speed: 4.2, ry: 11, rw: 2.2 },
    { color: '#F59E0B', angle: 36,  speed: 5.6, ry: 13, rw: 1.8 },
    { color: '#FDE68A', angle: 72,  speed: 4.8, ry: 10, rw: 1.6 },
    { color: '#D97706', angle: 108, speed: 5.0, ry: 14, rw: 2.0 },
    { color: '#FBBF24', angle: 144, speed: 4.4, ry: 12, rw: 1.8 },
    { color: '#FEF08A', angle: 180, speed: 5.8, ry: 11, rw: 1.6 },
  ];

  return (
    <motion.span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: size, height: size, cursor: 'default' }}
      animate={showGlow ? {
        filter: [
          'drop-shadow(0 0 1.5px #FFD700dd) drop-shadow(0 0 3px #C8960077)',
          'drop-shadow(0 0 3px #FFD700ff) drop-shadow(0 0 6px #C89600bb)',
          'drop-shadow(0 0 1.5px #FFD700dd) drop-shadow(0 0 3px #C8960077)',
        ],
      } : { filter: 'none' }}
      whileHover={{ scale: 1.12, filter: 'brightness(1.12) drop-shadow(0 0 4px #FFD700ff) drop-shadow(0 0 8px #C89600cc)' }}
      whileTap={{ scale: 0.95 }}
      transition={showGlow
        ? { filter: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }, scale: { type: 'spring', stiffness: 280, damping: 18 } }
        : { type: 'spring', stiffness: 280, damping: 18 }
      }
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }} aria-label="موثّق">
        <defs>
          <radialGradient id={`g1${uid}`} cx="32%" cy="28%" r="68%">
            <stop offset="0%"   stopColor="#FFFBEB" />
            <stop offset="20%"  stopColor="#FDE68A" />
            <stop offset="50%"  stopColor="#F59E0B" />
            <stop offset="80%"  stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </radialGradient>
          <linearGradient id={`rg1${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.05" />
            <stop offset="25%"  stopColor="#FDE68A" stopOpacity="1" />
            <stop offset="50%"  stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="75%"  stopColor="#FDE68A" stopOpacity="1" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.05" />
          </linearGradient>
          <filter id={`sf${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feFlood floodColor="#D4A017" floodOpacity="0.22" result="c" />
            <feComposite in="c" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`og${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          </filter>
          <clipPath id={`gclip${uid}`}><circle cx={cx} cy={cy} r={44} /></clipPath>
          <filter id={`ck${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
            <feFlood floodColor="#FDE68A" floodOpacity="0.9" result="c" />
            <feComposite in="c" in2="b" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <AnimatePresence>
          {hovered && (
            <motion.circle key="wave" cx={cx} cy={cy} fill="none" stroke="#FCD34D" strokeWidth={3}
              initial={{ r: 22, opacity: 1 }}
              animate={{ r: [22, 65, 85], opacity: [1, 0.4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }} />
          )}
        </AnimatePresence>

        {/* 6 gold orbit rings — like Cyberpunk/Legendary */}
        {showGlow && GOLD_RINGS.map((ring, i) => (
          <motion.g key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: ring.speed, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <ellipse cx={cx} cy={cy} rx={54} ry={ring.ry} fill="none"
              stroke={ring.color} strokeWidth={ring.rw} opacity={0.85}
              transform={`rotate(${ring.angle}, ${cx}, ${cy})`} />
          </motion.g>
        ))}

        <motion.path d={seal} fill={`url(#g1${uid})`} filter={`url(#sf${uid})`}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }} />

        <circle cx={cx} cy={cy} r={23} fill="#0D0600" />

        {showGlow && (
          <motion.circle cx={cx} cy={cy} r={13} fill="#FFD700" filter={`url(#og${uid})`}
            animate={{ opacity: [0.18, 0.35, 0.18] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
        )}

        <motion.circle cx={cx} cy={cy} r={20.5} fill="none" stroke="#FCD34D" strokeWidth={1.8}
          animate={{ opacity: [0.55, 1, 0.55], strokeWidth: [1.2, 2.5, 1.2] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />

        <motion.path d="M 37,51 L 45.5,60 L 64,40" fill="none" stroke="#FDE68A" strokeWidth={5.5}
          strokeLinecap="round" strokeLinejoin="round" filter={`url(#ck${uid})`}
          animate={{ opacity: [0.85, 1, 0.85], strokeWidth: [5.5, 7, 5.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />

        {[
          { x: 36, y: 71, d: 0,    sz: 3.5, color: '#FCD34D' },
          { x: 50, y: 73, d: 0.5,  sz: 4.2, color: '#FBBF24' },
          { x: 64, y: 71, d: 1.0,  sz: 3.5, color: '#FCD34D' },
          { x: 42, y: 68, d: 0.28, sz: 2.8, color: '#FEF08A' },
          { x: 58, y: 68, d: 0.82, sz: 2.8, color: '#FEF08A' },
          { x: 50, y: 65, d: 1.4,  sz: 2.2, color: '#FFFFFF' },
        ].map((p, i) => (
          <motion.circle key={i} cx={p.x} cy={p.y} r={p.sz} fill={p.color}
            initial={{ cy: p.y, r: p.sz }}
            animate={{ cy: [p.y, p.y - 34, p.y - 60], opacity: [0, 1, 0], r: [p.sz, p.sz * 0.9, 0.5] }}
            transition={{ duration: 1.8, delay: p.d, repeat: Infinity, ease: 'easeOut' }} />
        ))}
      </svg>
    </motion.span>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   AdminBadge — purple / neon / cyberpunk (مشرف النظام)
══════════════════════════════════════════════════════════════════════════ */
export const AdminBadge = React.memo(function AdminBadge({ size = 20, showGlow = true }: { size?: number; showGlow?: boolean }) {
  const uid = useId().replace(/:/g, 'x');
  const [hovered, setHovered] = useState(false);
  const cx = 50; const cy = 50;
  const seal = sealPath(cx, cy, 42, 33, 12);

  /* 6 cyberpunk rings — matches Legendary ring count, neon purple/cyan spectrum */
  const CYBER_RINGS = [
    { color: '#C4B5FD', angle: 0,   speed: 4.2, ry: 11, rw: 2.2 },
    { color: '#A78BFA', angle: 36,  speed: 5.6, ry: 13, rw: 1.8 },
    { color: '#7C3AED', angle: 72,  speed: 4.8, ry: 10, rw: 1.6 },
    { color: '#38BDF8', angle: 108, speed: 5.0, ry: 14, rw: 2.0 },
    { color: '#818CF8', angle: 144, speed: 4.4, ry: 12, rw: 1.8 },
    { color: '#EC4899', angle: 180, speed: 5.8, ry: 11, rw: 1.6 },
  ];

  const sparks = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI * 2) / 6 + 0.3;
    return { x: +(cx + 43 * Math.cos(a)).toFixed(2), y: +(cy + 43 * Math.sin(a)).toFixed(2), delay: i * 0.35 };
  });
  const particles = Array.from({ length: 5 }, (_, i) => {
    const a = (i * Math.PI * 2) / 5;
    return { cx: +(cx + 38 * Math.cos(a)).toFixed(2), cy: +(cy + 38 * Math.sin(a)).toFixed(2), delay: i * 0.4 };
  });

  return (
    <motion.span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: size, height: size, cursor: 'default' }}
      animate={showGlow ? {
        filter: [
          'drop-shadow(0 0 2px #7C3AEDcc) drop-shadow(0 0 4px #7C3AED88)',
          'drop-shadow(0 0 3px #A78BFAff) drop-shadow(0 0 7px #A78BFAcc)',
          'drop-shadow(0 0 2px #38BDF8cc) drop-shadow(0 0 4px #38BDF888)',
          'drop-shadow(0 0 3px #A78BFAff) drop-shadow(0 0 7px #A78BFAcc)',
          'drop-shadow(0 0 2px #7C3AEDcc) drop-shadow(0 0 4px #7C3AED88)',
        ],
      } : { filter: 'none' }}
      whileHover={{ scale: 1.1, filter: 'brightness(1.3) drop-shadow(0 0 6px #A78BFAff) drop-shadow(0 0 10px #7C3AEDcc)' }}
      whileTap={{ scale: 0.95 }}
      transition={showGlow
        ? { filter: { duration: 3.0, repeat: Infinity, ease: 'easeInOut' }, scale: { type: 'spring', stiffness: 280, damping: 18 } }
        : { type: 'spring', stiffness: 280, damping: 18 }
      }
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }} aria-label="مشرف">
        <defs>
          <radialGradient id={`ag1${uid}`} cx="30%" cy="25%" r="72%">
            <stop offset="0%"   stopColor="#EDE9FE" />
            <stop offset="25%"  stopColor="#C4B5FD" />
            <stop offset="55%"  stopColor="#7C3AED" />
            <stop offset="80%"  stopColor="#4C1D95" />
            <stop offset="100%" stopColor="#1E0040" />
          </radialGradient>
          <linearGradient id={`ar1${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.05" />
            <stop offset="25%"  stopColor="#A78BFA" stopOpacity="1" />
            <stop offset="50%"  stopColor="#EDE9FE" stopOpacity="1" />
            <stop offset="75%"  stopColor="#A78BFA" stopOpacity="1" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id={`ar2${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#6D28D9" stopOpacity="0.05" />
            <stop offset="30%"  stopColor="#818CF8" stopOpacity="0.8" />
            <stop offset="70%"  stopColor="#818CF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id={`ar3${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.05" />
            <stop offset="40%"  stopColor="#38BDF8" stopOpacity="0.6" />
            <stop offset="60%"  stopColor="#38BDF8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.05" />
          </linearGradient>
          <filter id={`asf${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feFlood floodColor="#7C3AED" floodOpacity="0.7" result="c" />
            <feComposite in="c" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`aog${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
          <clipPath id={`aclip${uid}`}><circle cx={cx} cy={cy} r={44} /></clipPath>
          <radialGradient id={`abg${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#A78BFA" stopOpacity="0.55" />
            <stop offset="45%"  stopColor="#7C3AED" stopOpacity="0.35" />
            <stop offset="80%"  stopColor="#38BDF8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>
          <filter id={`ack${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
            <feFlood floodColor="#C4B5FD" floodOpacity="0.9" result="c" />
            <feComposite in="c" in2="b" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`asp${uid}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Soft backdrop glow — clipped inside badge boundary */}
        {showGlow && (
          <g clipPath={`url(#aclip${uid})`}>
            <motion.circle cx={cx} cy={cy} r={36} fill={`url(#abg${uid})`} filter={`url(#aog${uid})`}
              animate={{ opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
          </g>
        )}

        <AnimatePresence>
          {hovered && (
            <motion.circle key="wave" cx={cx} cy={cy} fill="none" stroke="#C4B5FD" strokeWidth={2}
              initial={{ r: 22, opacity: 0.9 }} animate={{ r: [22, 65, 80], opacity: [0.9, 0.3, 0] }}
              exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
          )}
        </AnimatePresence>

        {/* Gradient glow behind orbit rings — smooth cyberpunk colors */}
        <defs>
          <radialGradient id={`acybg-rings${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="30%" stopColor="#A78BFA" stopOpacity="0.20" />
            <stop offset="55%" stopColor="#7C3AED" stopOpacity="0.22" />
            <stop offset="75%" stopColor="#38BDF8" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
          </radialGradient>
          <filter id={`acybg-rings-blur${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
        </defs>
        <motion.circle cx={cx} cy={cy} r={32} fill={`url(#acybg-rings${uid})`}
          filter={`url(#acybg-rings-blur${uid})`}
          animate={{ opacity: [0.45, 0.70, 0.45] }}
          transition={{ duration: 4.0, repeat: Infinity, ease: 'easeInOut' }} />

        {/* 6 orbit rings — matches Legendary count, smoother */}
        {CYBER_RINGS.map((ring, i) => (
          <motion.g key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: ring.speed, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <ellipse cx={cx} cy={cy} rx={54} ry={ring.ry} fill="none"
              stroke={ring.color} strokeWidth={ring.rw} opacity={0.88}
              transform={`rotate(${ring.angle}, ${cx}, ${cy})`} />
          </motion.g>
        ))}

        <motion.line x1={cx} y1={cy} x2={cx} y2={14} stroke="#C4B5FD" strokeWidth={1.8} strokeLinecap="round"
          opacity={0.85} filter={`url(#asp${uid})`}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }} />

        <motion.path d={seal} fill={`url(#ag1${uid})`} filter={`url(#asf${uid})`}
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }} />

        <circle cx={cx} cy={cy} r={23} fill="#0a0018" />

        {showGlow && (
          <motion.circle cx={cx} cy={cy} r={14} fill="#7C3AED" filter={`url(#aog${uid})`}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }} />
        )}

        <motion.circle cx={cx} cy={cy} r={20.5} fill="none" stroke="#7C3AED" strokeWidth={1.5}
          animate={{ opacity: [0.4, 1, 0.4], strokeWidth: [1, 2.2, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />

        {[42, 46, 50, 54, 58].map((y, i) => (
          <motion.line key={i} x1={35} y1={y} x2={65} y2={y} stroke="#A78BFA" strokeWidth={0.6}
            animate={{ opacity: [0, 0.5, 0], x1: [35, 32, 35], x2: [65, 68, 65] }}
            transition={{ duration: 1.5, delay: i * 0.12, repeat: Infinity, ease: 'easeInOut' }} />
        ))}

        <motion.path d="M 37,51 L 45.5,60 L 64,40" fill="none" stroke="#EDE9FE" strokeWidth={5.5}
          strokeLinecap="round" strokeLinejoin="round" filter={`url(#ack${uid})`}
          animate={{ opacity: [0.85, 1, 0.85], strokeWidth: [5, 6.5, 5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />

        {sparks.map((s, i) => (
          <motion.circle key={i} cx={+s.x} cy={+s.y} r={1.8} fill="#C4B5FD"
            animate={{ opacity: [0, 1, 0], r: [1, 3, 0] }}
            transition={{ duration: 0.6, delay: s.delay, repeat: Infinity, repeatDelay: 2.5, ease: 'easeOut' }} />
        ))}

        {particles.map((p, i) => (
          <motion.circle key={i} cx={+p.cx} cy={+p.cy} r={2}
            fill={i % 2 === 0 ? '#A78BFA' : '#38BDF8'}
            initial={{ cy: +p.cy, r: 1.5 }}
            animate={{ opacity: [0, 0.9, 0], r: [1.5, 3, 0], cy: [+p.cy, +p.cy - 20, +p.cy - 38] }}
            transition={{ duration: 2.4, delay: p.delay, repeat: Infinity, ease: 'easeOut' }} />
        ))}
      </svg>
    </motion.span>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   RainbowBadge — Legendary · smooth multi-spectrum (أدمن أسطوري)
   Balanced color distribution · No purple dominance · Silky animation
══════════════════════════════════════════════════════════════════════════ */
export const RainbowBadge = React.memo(function RainbowBadge({ size = 20, showGlow = true }: { size?: number; showGlow?: boolean }) {
  const uid = useId().replace(/:/g, 'x');
  const [hovered, setHovered] = useState(false);
  const cx = 50; const cy = 50;
  const seal = sealPath(cx, cy, 42, 34, 16);


  const RINGS = [
    { color: '#FF4D4D', angle: 0,   speed: 4.0, ry: 11, rw: 2.2 },
    { color: '#FF9500', angle: 36,  speed: 5.5, ry: 13, rw: 1.8 },
    { color: '#FFD700', angle: 72,  speed: 4.8, ry: 10, rw: 1.6 },
    { color: '#00CC55', angle: 108, speed: 5.0, ry: 14, rw: 2.0 },
    { color: '#00AAFF', angle: 144, speed: 4.2, ry: 12, rw: 1.8 },
    { color: '#FF44CC', angle: 180, speed: 5.8, ry: 11, rw: 1.6 },
  ];

  const colorParticles = [
    { x: 38, baseY: 70, delay: 0,    sz: 2.4, color: '#FF6B6B' },
    { x: 50, baseY: 72, delay: 0.5,  sz: 2.8, color: '#FFD700' },
    { x: 62, baseY: 70, delay: 1.0,  sz: 2.4, color: '#00E5FF' },
    { x: 44, baseY: 68, delay: 0.25, sz: 1.8, color: '#FF44CC' },
    { x: 56, baseY: 68, delay: 0.75, sz: 1.8, color: '#00CC55' },
    { x: 50, baseY: 66, delay: 1.5,  sz: 1.6, color: '#FF9500' },
  ];

  return (
    <motion.span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: size, height: size, cursor: 'default' }}
      animate={showGlow ? {
        filter: [
          'drop-shadow(0 0 2px #FF4D4Dcc) drop-shadow(0 0 3px #FF4D4D88)',
          'drop-shadow(0 0 2px #FFD700cc) drop-shadow(0 0 3px #FFD70088)',
          'drop-shadow(0 0 2px #00CC55cc) drop-shadow(0 0 3px #00CC5588)',
          'drop-shadow(0 0 2px #00AAFFcc) drop-shadow(0 0 3px #00AAFF88)',
          'drop-shadow(0 0 2px #FF4D4Dcc) drop-shadow(0 0 3px #FF4D4D88)',
        ],
      } : { filter: 'none' }}
      whileHover={{ scale: 1.1, filter: 'brightness(1.3) saturate(1.3)' }}
      whileTap={{ scale: 0.95 }}
      transition={showGlow
        ? { filter: { duration: 4.0, repeat: Infinity, ease: 'easeInOut' }, scale: { type: 'spring', stiffness: 280, damping: 18 } }
        : { type: 'spring', stiffness: 280, damping: 18 }
      }
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <style>{`
        @keyframes rb-spectrum-${uid} {
          0%   { filter: hue-rotate(0deg)   brightness(1.05) saturate(1.1); }
          25%  { filter: hue-rotate(90deg)  brightness(1.10) saturate(1.2); }
          50%  { filter: hue-rotate(180deg) brightness(1.05) saturate(1.1); }
          75%  { filter: hue-rotate(270deg) brightness(1.10) saturate(1.2); }
          100% { filter: hue-rotate(360deg) brightness(1.05) saturate(1.1); }
        }
        .rb-seal-${uid} { animation: rb-spectrum-${uid} 6s linear infinite; }
      `}</style>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }} aria-label="أدمن أسطوري">
        <defs>
          <radialGradient id={`rb1${uid}`} cx="28%" cy="22%" r="78%">
            <stop offset="0%"   stopColor="#FFFFFF" />
            <stop offset="12%"  stopColor="#FFE566" />
            <stop offset="28%"  stopColor="#FF6B35" />
            <stop offset="46%"  stopColor="#FF1493" />
            <stop offset="62%"  stopColor="#9B30FF" />
            <stop offset="80%"  stopColor="#1E90FF" />
            <stop offset="100%" stopColor="#001144" />
          </radialGradient>
          <filter id={`rbog${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
          <clipPath id={`rbclip${uid}`}><circle cx={cx} cy={cy} r={44} /></clipPath>
          <filter id={`rbck${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
            <feFlood floodColor="#FFFFFF" floodOpacity="0.9" result="c" />
            <feComposite in="c" in2="b" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`rbsf${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feFlood floodColor="#FF8C00" floodOpacity="0.5" result="c" />
            <feComposite in="c" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Soft multi-spectrum backdrop glow — subtle and elegant */}
          <radialGradient id={`rbbg${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFD700" stopOpacity="0.45" />
            <stop offset="35%"  stopColor="#FF44CC" stopOpacity="0.30" />
            <stop offset="65%"  stopColor="#00AAFF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft subtle backdrop glow — clipped inside badge */}
        {showGlow && (
          <g clipPath={`url(#rbclip${uid})`}>
            <motion.circle cx={cx} cy={cy} r={36} fill="#FFD700" filter={`url(#rbog${uid})`}
              animate={{ opacity: [0.55, 0.80, 0.55] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.circle cx={cx} cy={cy} r={28} fill="#FF44CC" filter={`url(#rbog${uid})`}
              animate={{ opacity: [0.35, 0.55, 0.35] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }} />
            <motion.circle cx={cx} cy={cy} r={40} fill={`url(#rbbg${uid})`} filter={`url(#rbog${uid})`}
              animate={{ opacity: [0.45, 0.65, 0.45] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
          </g>
        )}


        <AnimatePresence>
          {hovered && (
            <motion.circle key="wave" cx={cx} cy={cy} fill="none" stroke="#FFD700" strokeWidth={2}
              initial={{ r: 22, opacity: 0.9 }} animate={{ r: [22, 65, 80], opacity: [0.9, 0.3, 0] }}
              exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
          )}
        </AnimatePresence>

        {/* Gradient glow behind orbit rings — smooth & professional */}
        <defs>
          <radialGradient id={`rbbg-rings${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="30%" stopColor="#FF6B35" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#FFD700" stopOpacity="0.22" />
            <stop offset="75%" stopColor="#00AAFF" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#FF44CC" stopOpacity="0" />
          </radialGradient>
          <filter id={`rbbg-rings-blur${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
        </defs>
        <motion.circle cx={cx} cy={cy} r={42} fill={`url(#rbbg-rings${uid})`}
          filter={`url(#rbbg-rings-blur${uid})`}
          animate={{ opacity: [0.45, 0.65, 0.45] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Orbit rings — 6 colors evenly spaced */}
        {RINGS.map((ring, i) => (
          <motion.g key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: ring.speed, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <ellipse cx={cx} cy={cy} rx={54} ry={ring.ry} fill="none"
              stroke={ring.color} strokeWidth={ring.rw} opacity={0.85}
              transform={`rotate(${ring.angle}, ${cx}, ${cy})`} />
          </motion.g>
        ))}

        {/* Seal with spectrum animation */}
        <path d={seal} fill={`url(#rb1${uid})`} filter={`url(#rbsf${uid})`}
          className={`rb-seal-${uid}`} />

        {/* Dark centre */}
        <circle cx={cx} cy={cy} r={23} fill="#080014" />

        {/* Centre spectrum glow */}
        {showGlow && (
          <motion.circle cx={cx} cy={cy} r={14}
            fill="none" stroke="#FFD700" strokeWidth={3}
            filter={`url(#rbog${uid})`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }} />
        )}

        {/* Inner ring */}
        <motion.circle cx={cx} cy={cy} r={20.5} fill="none" stroke="#FFD700" strokeWidth={1.5}
          animate={{ opacity: [0.4, 1, 0.4], strokeWidth: [1, 2.2, 1] }}
          transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Checkmark */}
        <motion.path d="M 37,51 L 45.5,60 L 64,40" fill="none" stroke="#FFFFFF" strokeWidth={5.5}
          strokeLinecap="round" strokeLinejoin="round" filter={`url(#rbck${uid})`}
          animate={{ opacity: [0.88, 1, 0.88], strokeWidth: [5, 6.5, 5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Color particles */}
        {colorParticles.map((p, i) => (
          <motion.circle key={i} cx={p.x} cy={p.baseY} r={p.sz} fill={p.color}
            initial={{ cy: p.baseY, r: p.sz }}
            animate={{ cy: [p.baseY, p.baseY - 32, p.baseY - 58], opacity: [0, 1, 0], r: [p.sz, p.sz * 0.85, 0.4] }}
            transition={{ duration: 2.0, delay: p.delay, repeat: Infinity, ease: 'easeOut' }} />
        ))}
      </svg>
    </motion.span>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   ChatBadge — badge with tight drop-shadow glow for use inside chat messages
   Legendary = gold/pink glow · Cyberpunk = purple/cyan glow
══════════════════════════════════════════════════════════════════════════ */
export const ChatBadge = React.memo(function ChatBadge({
  badge,
  size = 22,
}: {
  badge?: 'legendary' | 'cyberpunk';
  size?: number;
}) {
  const isLegendary = badge === 'legendary';
  const animKey = isLegendary ? 'leg' : 'cyb';
  const glow1a = isLegendary ? '#FFD700cc' : '#7C3AEDcc';
  const glow1b = isLegendary ? '#FF44CC88' : '#38BDF888';
  const glow2a = isLegendary ? '#FFD700ff' : '#A78BFAff';
  const glow2b = isLegendary ? '#FF44CCcc' : '#38BDF8cc';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'visible' }}>
      <style>{`
        @keyframes cbglow-${animKey}{
          0%,100%{filter:drop-shadow(0 0 1px ${glow1a}) drop-shadow(0 0 2px ${glow1b})}
          50%{filter:drop-shadow(0 0 1.5px ${glow2a}) drop-shadow(0 0 3px ${glow2b})}
        }
      `}</style>
      <span style={{ display:'inline-flex', overflow:'visible', animation:`cbglow-${animKey} 2.0s ease-in-out infinite` }}>
        {isLegendary ? <RainbowBadge size={size} /> : <AdminBadge size={size} />}
      </span>
    </span>
  );
});
