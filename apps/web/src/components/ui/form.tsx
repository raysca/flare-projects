import * as React from "react"

import { cn } from "../../lib/utils"
import { Label } from "./label"

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: string
    error?: string
    children: React.ReactNode
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
    ({ className, label, error, children, ...props }, ref) => {
        return (
            <div ref={ref} className={cn("space-y-2", className)} {...props}>
                {label && <Label className={cn(error && "text-destructive")}>{label}</Label>}
                {children}
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </div>
        )
    }
)
FormField.displayName = "FormField"

export { FormField }
