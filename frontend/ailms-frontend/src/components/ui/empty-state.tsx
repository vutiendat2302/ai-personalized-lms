import React from "react"
import { Button } from "./button"
import { BookOpen, Search } from "lucide-react"

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  type?: "courses" | "search" | "default";
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  type = "default",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-card border border-border/60 shadow-sm max-w-md mx-auto my-8 animate-in fade-in duration-300">
      {/* Illustration visual container */}
      <div className="relative flex items-center justify-center w-20 h-20 mb-5 rounded-full bg-neutral-soft-gray dark:bg-brand-primary/10">
        {type === "courses" ? (
          <>
            <BookOpen className="w-9 h-9 text-brand-primary dark:text-brand-cobalt" />
            <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-neutral-soft-yellow animate-bounce" />
          </>
        ) : type === "search" ? (
          <>
            <Search className="w-9 h-9 text-brand-primary dark:text-brand-cobalt" />
            <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-alert-orange animate-pulse" />
          </>
        ) : (
          <BookOpen className="w-9 h-9 text-brand-primary dark:text-brand-cobalt" />
        )}
      </div>

      {/* Text Hierarchy */}
      <h3 className="text-base font-bold text-foreground mb-2 leading-snug">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground mb-6 leading-relaxed max-w-[280px]">
        {description}
      </p>

      {/* CTA Trigger */}
      {actionText && onAction && (
        <Button
          onClick={onAction}
          variant="default"
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-md shadow-primary/10 px-6 py-2 rounded-lg transition-all cursor-pointer"
        >
          {actionText}
        </Button>
      )}
    </div>
  )
}
