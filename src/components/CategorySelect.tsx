'use client'

import React from 'react'
import {
  AlertTriangle,
  LightbulbOff,
  CloudRain,
  Trash2,
  Droplets,
  Building2,
  MoreHorizontal,
  LucideIcon
} from 'lucide-react'
import { CATEGORIES, ReportCategory } from '@/types'
import { cn } from '@/lib/cn'

interface CategorySelectProps {
  value: ReportCategory | ''
  onChange: (value: ReportCategory) => void
}

const iconMap: Record<string, LucideIcon> = {
  AlertTriangle,
  LightbulbOff,
  CloudRain,
  Trash2,
  Droplets,
  Building2,
  MoreHorizontal
}

export default function CategorySelect({ value, onChange }: CategorySelectProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-foreground">
        Apa masalahnya? <span className="text-danger">*</span>
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES.map((cat) => {
          const Icon = iconMap[cat.icon] || MoreHorizontal
          const isSelected = value === cat.value

          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => onChange(cat.value)}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 text-center gap-2",
                isSelected
                  ? "border-primary bg-primary-light text-primary-dark shadow-md scale-105"
                  : "border-border bg-white text-muted hover:border-primary-light hover:bg-muted-light"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl",
                isSelected ? "bg-white/50" : "bg-muted-light"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium leading-tight">
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
