"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
    <AccordionPrimitive.Item
        ref={ref}
        className={cn(
            "overflow-x-hidden border-4 border-black shadow-[4px_4px_0_0_#000]",
            className,
        )}
        {...props}
    />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
            ref={ref}
            className={cn(
                "flex flex-1 items-center justify-between border-black bg-[var(--brutalist-yellow)] p-4 font-bold text-black uppercase tracking-wide transition-all [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:border-b-4",
                className,
            )}
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            {...props}
        >
            {children}
            <ChevronDown className="h-6 w-6 shrink-0 transition-transform duration-200 stroke-[3px]" />
        </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content
        ref={ref}
        className="overflow-hidden bg-[var(--brutalist-cream)] text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        style={{ fontFamily: "'Space Mono', monospace" }}
        {...props}
    >
        <div className={cn("p-4 border-t-4 border-black", className)}>{children}</div>
    </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
