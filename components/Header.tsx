import Link from 'next/link';

interface HeaderProps {
  user?: {
    email?: string | null;
  } | null;
  onLogout?: () => void;
  showAuth?: boolean;
}

export default function Header({ user, onLogout, showAuth = true }: HeaderProps) {
  return (
    <header className="bg-white border-b border-border">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="flex items-center space-x-1">
              <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 32L20 8L32 32H8Z" fill="#41b6e6"/>
                <path d="M14 32L20 20L26 32H14Z" fill="#111827"/>
              </svg>
              <span className="font-display text-2xl font-semibold text-foreground">Marin</span>
            </div>
          </Link>

          {/* Navigation */}
          {showAuth && (
            <div className="flex items-center space-x-6">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                  <button
                    onClick={onLogout}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
