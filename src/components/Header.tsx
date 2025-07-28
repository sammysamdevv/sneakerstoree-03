import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import CartDrawer from "./CartDrawer";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate("/");
    }
  };

  const categories = [
    {
      name: "Women Shoes",
      href: "/category/women-shoes",
      subcategories: [
        { name: "Sandals", href: "/category/sandals" },
        { name: "Sneakers", href: "/category/women-sneakers" },
        { name: "Heels", href: "/category/heels" },
        { name: "Flats", href: "/category/flats" },
        { name: "Unisex Sneakers", href: "/category/women-unisex-sneakers" },
      ],
    },
    {
      name: "Men Shoes",
      href: "/category/men-shoes", 
      subcategories: [
        { name: "Jordans", href: "/category/jordans" },
        { name: "Nike", href: "/category/nike" },
        { name: "Loafers", href: "/category/loafers" },
        { name: "Casual", href: "/category/casual" },
        { name: "Unisex Sneakers", href: "/category/men-unisex-sneakers" },
      ],
    },
    {
      name: "Unisex Shoes",
      href: "/category/unisex-shoes",
      subcategories: [],
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-primary">Eden Sneakers</span>
            <img
              src="/lovable-uploads/fc4c83df-0c8f-4dc1-b577-fda0d7537c33.png" 
              alt="Eden Sneakers Logo" 
              className="h-8 w-8"
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            to="/"
            className="text-foreground hover:text-primary transition-colors flex items-center space-x-1"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <Link
            to="/products"
            className="text-foreground hover:text-primary transition-colors"
          >
            All Products
          </Link>
          {categories.map((category) => (
            <div key={category.name} className="relative group">
              <Link
                to={category.href}
                className="text-foreground hover:text-primary transition-colors"
              >
                {category.name}
              </Link>
              {category.subcategories.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-background border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-2">
                    {category.subcategories.map((sub) => (
                      <Link
                        key={sub.name}
                        to={sub.href}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Mobile Navigation */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col space-y-4">
              <Link
                to="/"
                className="text-lg font-medium text-foreground hover:text-primary flex items-center space-x-2"
                onClick={() => setIsOpen(false)}
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
              <Link
                to="/products"
                className="text-lg font-medium text-foreground hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                All Products
              </Link>
              {categories.map((category) => (
                <div key={category.name}>
                  <Link
                    to={category.href}
                    className="text-lg font-medium text-foreground hover:text-primary"
                    onClick={() => setIsOpen(false)}
                  >
                    {category.name}
                  </Link>
                  {category.subcategories.length > 0 && (
                    <div className="ml-4 mt-2 space-y-2">
                      {category.subcategories.map((sub) => (
                        <Link
                          key={sub.name}
                          to={sub.href}
                          className="block text-sm text-muted-foreground hover:text-primary"
                          onClick={() => setIsOpen(false)}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Right side icons */}
        <div className="flex items-center space-x-2">
          <CartDrawer />
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg">
                <div className="px-3 py-2 text-sm">
                  <p className="font-medium">Welcome back!</p>
                  <p className="text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
              <User className="h-5 w-5" />
              <span className="sr-only">Sign in</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;