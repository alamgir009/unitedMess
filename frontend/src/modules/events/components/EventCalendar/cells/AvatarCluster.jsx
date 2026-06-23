import { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { cn } from '@/core/utils/helpers/string.helper';

function hashMemberId(id) {
  if (!id) return 0;
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const AVATAR_COLORS = [
  'bg-[var(--brand)]',
  'bg-[var(--info)]',
  'bg-[var(--slot-both)]',
  'bg-[var(--profit)]',
  'bg-[var(--warning)]',
  'bg-[hsl(180,50%,30%)]',
  'bg-[hsl(340,70%,45%)]',
  'bg-[hsl(30,60%,45%)]',
];

const SIZE_MAP = {
  sm: { container: 'w-5 h-5', text: 'text-[8px]', chip: 'w-5 h-5 text-[9px]', dot: 'w-1 h-1' },
  md: { container: 'w-6 h-6', text: 'text-[10px]', chip: 'w-6 h-6 text-[10px]', dot: 'w-1.5 h-1.5' },
};

const SingleAvatar = memo(({ member, size, overlapOffset, currentUser }) => {
  const s = SIZE_MAP[size] || SIZE_MAP.sm;
  const isUnpopulated = member?.user && typeof member.user === 'string';
  const name = member?.user?.name || member?.userName || (isUnpopulated ? currentUser?.name : '?');
  const src = member?.user?.image || (isUnpopulated ? currentUser?.image : undefined);
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);
  const colorIdx = hashMemberId(member?._id || member?.user?._id || name) % AVATAR_COLORS.length;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full overflow-hidden shrink-0',
        'ring-2 ring-[var(--bg-elevated)]',
        s.container,
        overlapOffset,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          width="20"
          height="20"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <span
        className={cn(
          'w-full h-full flex items-center justify-center text-white font-bold',
          s.text,
          AVATAR_COLORS[colorIdx],
          src ? 'hidden' : 'flex',
        )}
        aria-hidden="true"
      >
        {initials}
      </span>
    </span>
  );
});
SingleAvatar.displayName = 'SingleAvatar';

const OverflowChip = memo(({ count, size }) => {
  const s = SIZE_MAP[size] || SIZE_MAP.sm;
  const display = count > 99 ? '99+' : `+${count}`;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full shrink-0',
        'bg-[var(--surface-elevated)] border border-[var(--border-muted)]',
        'font-semibold text-[var(--text-secondary)] leading-none',
        s.chip,
        '-ml-1.5',
      )}
      aria-label={`${count} more`}
    >
      {display}
    </span>
  );
});
OverflowChip.displayName = 'OverflowChip';

const AvatarCluster = memo(({ members = [], size = 'sm' }) => {
  const currentUser = useSelector((state) => state.auth.user);
  const sorted = useMemo(() => {
    if (!members || members.length === 0) return [];
    return [...members].sort((a, b) => {
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });
  }, [members]);

  if (sorted.length === 0) return null;

  if (sorted.length === 1) {
    return <SingleAvatar member={sorted[0]} size={size} currentUser={currentUser} />;
  }

  if (sorted.length === 2) {
    return (
      <span className="inline-flex items-center">
        <SingleAvatar member={sorted[0]} size={size} currentUser={currentUser} />
        <span className="-ml-1.5">
          <SingleAvatar member={sorted[1]} size={size} currentUser={currentUser} />
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center">
      <SingleAvatar member={sorted[0]} size={size} currentUser={currentUser} />
      <OverflowChip count={sorted.length - 1} size={size} />
    </span>
  );
});

AvatarCluster.displayName = 'AvatarCluster';
export default AvatarCluster;
