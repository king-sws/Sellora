// components/store/pagination.tsx
"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  searchParams: Record<string, string | undefined>
}

export function Pagination({
  currentPage,
  totalPages,
  searchParams
}: PaginationProps) {
  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams()
    
    // Add all existing search params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== "page") {
        params.set(key, value)
      }
    })
    
    // Add page number
    if (pageNumber > 1) {
      params.set("page", pageNumber.toString())
    }
    
    return `/products?${params.toString()}`
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []
    const showEllipsis = totalPages > 7

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage <= 3) {
        // Near the start
        pages.push(2, 3, 4, "ellipsis", totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push("ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        // In the middle
        pages.push(
          "ellipsis",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "ellipsis",
          totalPages
        )
      }
    }

    return pages
  }

  const pages = getPageNumbers()

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        asChild={currentPage > 1}
        disabled={currentPage === 1}
        className={cn(
          "gap-1",
          currentPage === 1 && "opacity-50 cursor-not-allowed"
        )}
      >
        {currentPage > 1 ? (
          <Link href={createPageURL(currentPage - 1)}>
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Link>
        ) : (
          <>
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </>
        )}
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <div
                key={`ellipsis-${index}`}
                className="w-9 h-9 flex items-center justify-center text-gray-400"
              >
                <MoreHorizontal className="w-4 h-4" />
              </div>
            )
          }

          const isActive = page === currentPage

          return (
            <Button
              key={page}
              variant={isActive ? "default" : "outline"}
              size="sm"
              asChild={!isActive}
              disabled={isActive}
              className={cn(
                "w-9 h-9 p-0",
                isActive && "bg-gradient-to-r from-blue-600 to-blue-700 pointer-events-none"
              )}
            >
              {isActive ? (
                <span>{page}</span>
              ) : (
                <Link href={createPageURL(page)}>{page}</Link>
              )}
            </Button>
          )
        })}
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        asChild={currentPage < totalPages}
        disabled={currentPage === totalPages}
        className={cn(
          "gap-1",
          currentPage === totalPages && "opacity-50 cursor-not-allowed"
        )}
      >
        {currentPage < totalPages ? (
          <Link href={createPageURL(currentPage + 1)}>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </Button>

      {/* Page Info */}
      <div className="hidden lg:flex items-center ml-4 text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </div>
    </nav>
  )
}