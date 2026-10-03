import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "focus-ring-glow inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)] aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'border border-transparent bg-[var(--theme-accent)] text-black hover:brightness-110',
        destructive:
          'border border-rose-400/18 bg-[linear-gradient(180deg,rgba(120,26,38,0.92)_0%,rgba(92,18,30,0.96)_100%)] text-white shadow-[0_18px_34px_-24px_rgba(120,26,38,0.9)] hover:-translate-y-[1px] hover:border-rose-300/24 hover:bg-[linear-gradient(180deg,rgba(138,34,48,0.95)_0%,rgba(104,20,34,0.98)_100%)]',
        outline:
          'border border-white/20 bg-white/[0.05] text-white hover:bg-white/[0.1]',
        secondary:
          'border border-white/10 bg-white/[0.05] text-white/82 shadow-[0_14px_28px_-24px_rgba(0,0,0,0.9)] hover:-translate-y-[1px] hover:bg-white/[0.09] hover:text-white',
        ghost:
          'border border-transparent bg-transparent text-white/68 shadow-none hover:-translate-y-[1px] hover:border-white/10 hover:bg-white/[0.06] hover:text-white',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-lg px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? 'default'}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
