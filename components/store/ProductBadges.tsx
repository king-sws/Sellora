
// components/store/ProductBadges.tsx
interface ProductBadgesProps {
  discount: number
  stock: number
  salesCount: number
  isFeatured: boolean
}

export function ProductBadges({ discount, stock, salesCount, isFeatured }: ProductBadgesProps) {
  const badges = []

  if (discount > 20) {
    badges.push({
      text: `${discount}% OFF`,
      color: 'bg-red-600 text-white',
      icon: '🔥'
    })
  }

  if (stock > 0 && stock <= 5) {
    badges.push({
      text: 'Almost Gone',
      color: 'bg-orange-600 text-white',
      icon: '⚠️'
    })
  }

  if (salesCount > 500) {
    badges.push({
      text: 'Bestseller',
      color: 'bg-purple-600 text-white',
      icon: '⭐'
    })
  }

  if (isFeatured) {
    badges.push({
      text: 'Featured',
      color: 'bg-blue-600 text-white',
      icon: '✨'
    })
  }

  if (badges.length === 0) return null

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      {badges.map((badge, index) => (
        <div
          key={index}
          className={`${badge.color} px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5`}
        >
          <span>{badge.icon}</span>
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  )
}
