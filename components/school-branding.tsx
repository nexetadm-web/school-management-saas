"use client";

import React from "react";
import { getSchoolInitials } from "@/lib/school-context";
import { Building2, Phone, MapPin, Mail, UserCheck } from "lucide-react";

interface SchoolBrandingProps {
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  principalName?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "badge" | "banner" | "compact" | "print-header";
}

export function SchoolLogo({
  name,
  logoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const initials = getSchoolInitials(name);

  const sizeClasses = {
    xs: "w-7 h-7 text-xs",
    sm: "w-9 h-9 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-20 h-20 text-2xl",
  }[size];

  if (logoUrl && logoUrl.trim().length > 0) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`${sizeClasses} rounded-2xl object-contain bg-white p-1 border border-slate-200 shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-2xl bg-gradient-to-tr from-[#1e3a5f] to-indigo-600 text-yellow-300 font-black flex items-center justify-center shadow-md border-2 border-white/20 tracking-wider select-none shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}

export function SchoolPrintHeader({
  name,
  logoUrl,
  address,
  phone,
  title,
  subTitle,
  refNo,
  date,
}: {
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  title: string;
  subTitle?: string;
  refNo?: string;
  date?: string;
}) {
  return (
    <div className="border-b-2 border-slate-800 pb-4 mb-4 text-center">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-2">
        {refNo ? <span>Ref: {refNo}</span> : <span />}
        {date ? <span>Date: {date}</span> : <span />}
      </div>

      <div className="flex items-center justify-center gap-3 mb-2">
        <SchoolLogo name={name} logoUrl={logoUrl} size="lg" />
        <div className="text-center">
          <h1 className="text-2xl font-black uppercase text-slate-900 tracking-wide">
            {name}
          </h1>
          {address && <p className="text-xs text-slate-600 font-medium">{address}</p>}
          {phone && <p className="text-xs text-slate-500 font-mono mt-0.5">Phone: {phone}</p>}
        </div>
      </div>

      <div className="mt-3">
        <span className="inline-block px-6 py-1 rounded-full bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
          {title}
        </span>
        {subTitle && (
          <p className="text-[11px] text-slate-600 font-urdu mt-1">{subTitle}</p>
        )}
      </div>
    </div>
  );
}
