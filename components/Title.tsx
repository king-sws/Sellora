import { ReactNode } from "react"

interface TitleProps {
  children: ReactNode
  className?: string
}

export function Title({ children, className = "" }: TitleProps) {
  return (
    <h2
      className={`text-[22px] sm:text-4xl font-semibold text-[#333] mb-4 tracking-tight ${className}`}
    >
      {children}
    </h2>
  )
}
