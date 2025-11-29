'use client'

import { useSession, signOut } from 'next-auth/react'
import { 
  Search, 
  User, 
  Settings,
  HelpCircle,
  LogOut,
  UserCircle,
  Menu,
  X,
  Store,
  ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface AdminHeaderProps {
  onMenuToggle?: () => void
  isMenuOpen?: boolean
}

export function AdminHeader({ onMenuToggle, isMenuOpen = false }: AdminHeaderProps) {
  const { data: session } = useSession()
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle search functionality
    console.log('Searching for:', searchValue)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      {/* Left section - Mobile menu + Logo + Search */}
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Logo - Hidden on mobile when sidebar is collapsed, visible on larger screens */}
        <Link href="/" className="hidden sm:flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          <span className="hidden md:inline-block">Admin Panel</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search orders, products, customers..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
            />
          </form>
        </div>
      </div>

      {/* Right section - User menu */}
      <div className="flex items-center gap-2">
        {/* Quick Store Link */}
        <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
          <Link href="/" target="_blank">
            View Store
          </Link>
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-3">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={session?.user?.image || ''} 
                  alt={session?.user?.name || 'User'} 
                />
                <AvatarFallback>
                  {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-sm font-medium leading-none">
                  {session?.user?.name || 'Admin User'}
                </span>
                <Badge variant="secondary" className="mt-1 text-[10px] font-medium">
                  Administrator
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-56" align="end" forceMount>
            {/* User Info Section */}
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session?.user?.name || 'Admin User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email || 'admin@example.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            {/* Menu Items */}
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="flex items-center">
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help & Support</span>
            </DropdownMenuItem>
            
            {/* Mobile-only Store Link */}
            <DropdownMenuItem className="sm:hidden" asChild>
              <Link href="/" target="_blank">
                <Store className="mr-2 h-4 w-4" />
                <span>View Store</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}