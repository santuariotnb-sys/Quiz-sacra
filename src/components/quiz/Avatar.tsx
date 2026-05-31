import avatarSrc from "@/assets/guide-avatar.webp";
import { motion } from "framer-motion";

type Size = "hero" | "corner" | "chat";

export function GuideAvatar({
  size = "corner",
  src,
  alt = "Sua guia",
}: {
  size?: Size;
  src?: string;
  alt?: string;
}) {
  const dim =
    size === "hero"
      ? "h-44 w-44 sm:h-48 sm:w-48"
      : size === "chat"
        ? "h-[88px] w-[88px] sm:h-28 sm:w-28"
        : "h-[60px] w-[60px] sm:h-20 sm:w-20";
  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className={`relative shrink-0 ${dim}`}
    >
      <div className="absolute inset-0 rounded-full rdp-gradient-soft" />
      <div className="absolute inset-0 rounded-full ring-1 ring-[color:var(--lavender)]/40" />
      <img
        src={src ?? avatarSrc}
        alt={alt}
        width={size === "hero" ? 192 : size === "chat" ? 112 : 80}
        height={size === "hero" ? 192 : size === "chat" ? 112 : 80}
        className="relative h-full w-full rounded-full object-cover rdp-breath rdp-shadow-soft"
        loading="eager"
        decoding="async"
      />
    </motion.div>
  );
}