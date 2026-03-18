interface SectionTitleProps {
  tagline: string
  title: string
  highlight?: string
  align?: 'left' | 'center'
}

export default function SectionTitle({
  tagline,
  title,
  highlight,
  align = 'left',
}: SectionTitleProps) {
  const renderTitle = () => {
    if (!highlight) return title
    const parts = title.split(highlight)
    return (
      <>
        {parts[0]}
        <span>{highlight}</span>
        {parts[1] || ''}
      </>
    )
  }

  return (
    <div className={`section-title text-${align}`}>
      <div className="section-title__tagline-box">
        <span className="section-title__tagline">{tagline}</span>
      </div>
      <h2 className="section-title__title">{renderTitle()}</h2>
    </div>
  )
}
