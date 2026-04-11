import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-neutral-bg1 min-h-touch min-w-touch",
    {
        variants: {
            variant: {
                default:
                    "bg-brand text-white hover:bg-brand-hover shadow-glow",
                destructive:
                    "bg-status-error text-white hover:bg-status-error/90",
                outline:
                    "border border-border bg-transparent hover:bg-white/[0.05] text-text-primary",
                secondary:
                    "bg-neutral-bg3 text-text-primary hover:bg-neutral-bg4",
                ghost: "hover:bg-white/[0.05] text-text-primary hover:text-white",
                link: "text-brand underline-offset-4 hover:underline",
                glass: "glass hover:bg-white/[0.08] text-white",
            },
            size: {
                default: "h-12 px-6 py-2", // Minimum touch target height 48px
                sm: "h-10 px-4 text-xs min-h-[40px] min-w-[40px]", // Special case for dense UI
                lg: "h-14 px-8 text-base",
                icon: "h-12 w-12",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
