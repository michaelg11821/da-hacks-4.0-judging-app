"use client";

import { noHeaderPages } from "@/lib/constants/noHeaderPages";
import { capitalize } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { UserMenu } from "../user-menu/user-menu";

function Nav() {
  const pathname = usePathname();

  if (noHeaderPages.includes(pathname)) return null;

  return (
    <header className="border-b bg-background sticky top-0 z-100">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="ml-2">
            <h1 className="text-lg sm:text-xl font-semibold">
              {capitalize(pathname.slice(1))}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              De Anza Hacks 4.0
            </p>
          </div>

          <div className="ml-auto">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Nav;
