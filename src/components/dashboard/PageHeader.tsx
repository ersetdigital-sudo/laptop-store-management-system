interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink" style={{ fontWeight: 700 }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-ash">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:gap-2 sm:w-auto">
          {children}
        </div>
      )}
    </div>
  )
}
