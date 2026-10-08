import Image from 'next/image';

/**
 * ToolForForever Logo component.
 *
 * Official ToolForForever logo: vibrant round emblem (/logo1.png)
 * accompanied by the signature bold wordmark "ToolForForever".
 */
export function Logo({
  className = '',
  showWordmark = true,
  size = 40,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo1.png"
        alt="ToolForForever Logo"
        width={size}
        height={size}
        className="object-contain transition-transform duration-300 group-hover:scale-105"
        style={{ width: size, height: size }}
        priority
      />
      {showWordmark && (
        <span className="text-2xl font-extrabold tracking-tight text-slate-900 select-none">
          ToolForForever
        </span>
      )}
    </span>
  );
}
