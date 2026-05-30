"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  className?: string;
  iconSize?: number;
}

export default function LogoutButton({ className, iconSize = 16 }: LogoutButtonProps) {
  return (
    <button
      onClick={() => signOut({ redirectTo: "/" })}
      className={className}
    >
      <LogOut size={iconSize} />
      Déconnexion
    </button>
  );
}
