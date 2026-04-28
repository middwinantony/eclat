"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Compass,
  Heart,
  MessageSquare,
  User,
  CalendarDays,
  Settings,
  CreditCard,
  LogOut,
  Lock,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { VerificationStatus, Role, MembershipTier } from "@prisma/client"

interface SidebarProps {
  user: {
    name: string
    email: string
    role: Role
    verificationStatus: VerificationStatus
    membershipTier: MembershipTier | null
  }
}

const TIER_LABELS: Record<string, string> = {
  SELECT:  "Select",
  RESERVE: "Reserve",
  NOIR:    "Noir",
}

function NavLink({
  href,
  icon: Icon,
  label,
  locked,
  active,
}: {
  href: string
  icon: React.ElementType
  label: string
  locked?: boolean
  active?: boolean
}) {
  return (
    <Link
      href={locked ? "#" : href}
      aria-disabled={locked}
      onClick={locked ? (e) => e.preventDefault() : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 select-none",
        active
          ? "bg-[#A8476A]/10 text-[#A8476A] border border-[#A8476A]/20"
          : locked
          ? "text-[#B0A0A8] cursor-not-allowed pointer-events-none"
          : "text-[#7A6670] hover:text-[#1C1218] hover:bg-black/[0.04]"
      )}
    >
      <Icon size={16} className={active ? "text-[#A8476A]" : ""} />
      <span>{label}</span>
      {locked && <Lock size={12} className="ml-auto opacity-40" />}
    </Link>
  )
}

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const isVerified = user.verificationStatus === "VERIFIED"
  const isAdmin = user.role === "ADMIN"
  const isMatchmaker = user.role === "MATCHMAKER" || isAdmin

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-black/[0.07] bg-[#F3EDE7]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-black/[0.07]">
        <Link href="/dashboard" className="flex items-center gap-1.5 group">
          <span className="font-[family-name:var(--font-heading)] font-bold text-lg tracking-[-0.04em] text-[#1C1218] group-hover:text-[#A8476A] transition-colors duration-200">
            eclat
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#A8476A] mb-1.5 opacity-80" aria-hidden="true" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <NavLink href="/dashboard"  icon={LayoutDashboard} label="Overview"  active={isActive("/dashboard")} />
        <NavLink href="/browse"     icon={Compass}         label="Browse"    active={isActive("/browse")}    locked={!isVerified} />
        <NavLink href="/matches"    icon={Heart}           label="Matches"   active={isActive("/matches")}   locked={!isVerified} />
        <NavLink href="/messages"   icon={MessageSquare}   label="Messages"  active={isActive("/messages")}  locked={!isVerified} />
        <NavLink href="/profile"    icon={User}            label="Profile"   active={isActive("/profile")}   locked={!isVerified} />
        <NavLink href="/events"     icon={CalendarDays}    label="Events"    active={isActive("/events")}    locked={!isVerified} />

        {isMatchmaker && (
          <>
            <div className="my-3 h-px bg-black/[0.06]" />
            <NavLink href="/matchmaker" icon={Shield} label="Matchmaker" active={isActive("/matchmaker")} />
          </>
        )}
        {isAdmin && (
          <NavLink href="/admin" icon={Shield} label="Admin" active={isActive("/admin")} />
        )}

        <div className="my-3 h-px bg-black/[0.06]" />
        <NavLink href="/dashboard/settings" icon={Settings}   label="Settings" active={isActive("/dashboard/settings")} />
        <NavLink href="/dashboard/billing"  icon={CreditCard} label="Billing"  active={isActive("/dashboard/billing")}  />
      </nav>

      {/* User info + sign out */}
      <div className="px-3 py-4 border-t border-black/[0.07] space-y-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-[#1C1218] truncate">{user.name}</p>
          <p className="text-xs text-[#7A6670] truncate mt-0.5">{user.email}</p>
          {user.membershipTier && (
            <span className="inline-block mt-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#A8476A] border border-[#A8476A]/30 rounded px-1.5 py-0.5">
              {TIER_LABELS[user.membershipTier]}
            </span>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#7A6670] hover:text-[#1C1218] hover:bg-black/[0.04] transition-all duration-150"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
