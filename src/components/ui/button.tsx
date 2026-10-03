import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-deep shadow-sm",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-hairline bg-surface text-ink hover:shadow-card shadow-sm",
        secondary:
          "bg-secondary text-ink hover:bg-secondary/80",
        ghost:
          "text-ink hover:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline",
        honey: "bg-[#FEC40B] text-[#04123F] hover:bg-[#F5B800] shadow-sm font-semibold",
      },
      size: {
        default: "h-[44px] px-6 py-3",
        xs: "h-[32px] gap-1 px-3 text-xs",
        sm: "h-[36px] gap-1.5 px-4",
        lg: "h-[48px] px-8",
        icon: "size-[44px]",
        "icon-xs": "size-[32px]",
        "icon-sm": "size-[36px]",
        "icon-lg": "size-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
