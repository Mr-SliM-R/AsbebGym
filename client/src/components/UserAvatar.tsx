type UserAvatarProps = {
  avatar: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-14 w-14 text-xl",
  xl: "h-20 w-20 text-3xl"
};

function isImageAvatar(value: string) {
  return /^(data:image\/|https?:\/\/|\/)/i.test(value);
}

export function UserAvatar({ avatar, name, size = "md", className = "" }: UserAvatarProps) {
  const fallback = (name.trim()[0] || "?").toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-rival-cyan/15 font-black text-rival-cyan ${sizeClasses[size]} ${className}`}
    >
      {isImageAvatar(avatar) ? (
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{avatar || fallback}</span>
      )}
    </div>
  );
}
