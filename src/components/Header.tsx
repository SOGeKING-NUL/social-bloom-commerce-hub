import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Heart, ShoppingCart, List, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { cn } from "@/lib/utils";

// Define navigation links with TypeScript interface
interface NavLinkItem {
  to: string;
  label: string;
}

const navLinks: NavLinkItem[] = [
  { to: "/feed", label: "Feed" },
  { to: "/products", label: "Products" },
  { to: "/groups", label: "Groups" },
  { to: "/", label: "About" },
];
interface User {
  id: string;
}

export default function Header() {
  const location = useLocation();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  // Fetch cart count
  const { data: cartCount } = useQuery<number>({
    queryKey: ["cart-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase
        .from("cart_items")
        .select("quantity", { count: "exact" })
        .eq("user_id", user.id);
      if (error) return 0;
      return data.reduce(
        (sum: number, item: { quantity: number }) => sum + item.quantity,
        0
      );
    },
    enabled: !!user,
  });

  // Fetch wishlist count
  const { data: wishlistCount } = useQuery<number>({
    queryKey: ["wishlist-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("wishlist")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in">
      <div
        className={cn(
          "transition-all duration-500 ease-out mx-auto",
          scrolled
            ? "mt-6 max-w-6xl bg-white/10 backdrop-blur-2xl rounded-lg shadow-2xl shadow-black/50"
            : "max-w-6xl bg-transparent mt-4"
        )}
      >
        <div className="container mx-auto py-1 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <NavLink to="/" className="flex items-center justify-center pt-5">
              <span className="text-2xl font-borel font-bold text-pink-800">
                SocialBloom
              </span>
            </NavLink>

            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      "text-lg text-pink-600 transition-colors hover:text-pink-800",
                      isActive && "text-pink-600"
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center space-x-4 md:space-x-6">
              {user && (
                <>
                  <NavLink
                    to="/wishlist"
                    className="relative text-pink-600 hover:text-pink-800 group"
                  >
                    <Heart
                      size={22}
                      className="group-hover:fill-fuchsia-600 transition-colors"
                    />
                    {wishlistCount != null && wishlistCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-pink-500 text-pink-600 text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                    <span className="sr-only">Wishlist</span>
                  </NavLink>
                  <NavLink
                    to="/cart"
                    className="relative text-pink-600 hover:text-pink-800"
                  >
                    <ShoppingCart size={22} />
                    {cartCount != null && cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-pink-500 text-pink-600 text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                    <span className="sr-only">Cart</span>
                  </NavLink>
                </>
              )}

              <div className="hidden md:flex items-center space-x-2">
                {user ? (
                  <UserProfileDropdown />
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      asChild
                      className="text-pink-600 text-lg hover:text-pink-800 hover:bg-transparent"
                    >
                      <NavLink to="/auth">Login</NavLink>
                    </Button>
                    <Button
                      asChild
                      className="rounded-full border border-fuchsia-950 hover:scale-105 duration-300 transition-transform text-lg bg-transparent text-pink-600 hover:bg-transparent hover:text-pink-800 "
                    >
                      <NavLink to="/auth">Join Now</NavLink>
                    </Button>
                  </>
                )}
              </div>

              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-pink-600 hover:text-pink-800 hover:bg-transparent"
                >
                  {mobileMenuOpen ? <X size={28} /> : <List size={28} />}
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white/50 backdrop-blur-xl z-40 p-4">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "text-lg font-medium text-gray-900 transition-colors hover:text-pink-800 text-center py-2 rounded-md",
                    isActive && "text-pink-600 bg-white/10"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="border-t border-gray-700 pt-4 flex flex-col space-y-4 items-center">
              {user ? (
                <UserProfileDropdown />
              ) : (
                <>
                  <Button
                    variant="ghost"
                    asChild
                    className="w-full text-lg text-gray-300 hover:text-pink-800 hover:bg-transparent"
                  >
                    <NavLink
                      to="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Login
                    </NavLink>
                  </Button>
                  <Button
                    asChild
                    className="w-full rounded-full border border-gray-400 bg-transparent text-pink-600 hover:bg-white hover:text-pink-800 transition-colors"
                  >
                    <NavLink
                      to="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Join Now
                    </NavLink>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
