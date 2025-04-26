'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

// Define base styles and variants using cva
const badgeVariants = cva(
  // Base classes applied to all variants
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: // Used for 'Active' status
          "border-transparent bg-green-600 text-white hover:bg-green-600/80 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-700/80",
        secondary: // Used for Role 'tl' or 'agent'
          "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/80",
        destructive: // Potentially for 'Admin' role or errors
          "border-transparent bg-red-600 text-white hover:bg-red-600/80 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-800/80",
        outline: // Used for 'Inactive' status
          "text-gray-600 border-gray-300 dark:text-gray-400 dark:border-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Define props interface including variants
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

// Badge component implementation
function Badge({ className, variant, ...props }: BadgeProps) {
  // Apply the variants and any additional classes passed via className
  return (
    <div className={badgeVariants({ variant, className })} {...props} />
  )
}

export { Badge, badgeVariants } 