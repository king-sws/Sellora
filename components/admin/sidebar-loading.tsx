// components/admin/sidebar-loading.tsx (Optional loading state)
export function SidebarLoading() {
  return (
    <div className="w-64 bg-white shadow-sm h-full border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
          <div>
            <div className="w-24 h-5 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4">
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center px-3 py-2">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mr-3"></div>
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}