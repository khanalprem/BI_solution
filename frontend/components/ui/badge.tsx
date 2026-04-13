import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

// BankBI colour-variant mapping — mirrors old Pill variants
export const badgeColor = {
  green:  'bg-accent-green-dim  text-accent-green  border-transparent',
  red:    'bg-accent-red-dim    text-accent-red    border-transparent',
  amber:  'bg-accent-amber-dim  text-accent-amber  border-transparent',
  blue:   'bg-accent-blue-dim   text-accent-blue   border-transparent',
  purple: 'bg-accent-purple-dim text-accent-purple border-transparent',
  teal:   'bg-accent-teal-dim   text-accent-teal   border-transparent',
  muted:  'bg-bg-input          text-text-muted    border-transparent',
} as const;

export type BadgeColor = keyof typeof badgeColor;
