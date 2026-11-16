import Image from "next/image";

/**
 * The official GO ABROAD BD emblem, used as the brand mark.
 *
 * The source artwork is a circular badge on a transparent background, so it
 * drops straight into the existing round `.brand-mark` containers without
 * changing their navy/gold styling.
 */
export function BrandLogo({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/go-abroad-bd-logo.png"
      alt="GO ABROAD BD emblem — study and work abroad"
      width={size}
      height={size}
      priority
      className={`brand-logo ${className}`.trim()}
    />
  );
}
