"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { api } from "@/lib/convex/_generated/api";
import { capitalize } from "@/lib/utils";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { LogOut, User, Users } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export function UserMenu() {
  const { signOut } = useAuthActions();

  const currentUser = useQuery(api.user.currentUser);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer w-9 h-9" asChild>
          <Avatar>
            <AvatarImage src={currentUser.image} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">
                {capitalize(currentUser.role)}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="p-1 text-sm gap-2 select-none flex items-center">
            <ThemeToggle />
            Toggle theme
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              setTimeout(() => setIsGroupDialogOpen(true), 0);
            }}
            className="hover:bg-muted cursor-pointer"
          >
            <Users className="mr-2 h-4 w-4" />
            My group
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={signOut}
            className="text-red-600 hover:bg-muted cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My group</DialogTitle>
            <DialogDescription>
              {currentUser.judgingSession
                ? "Here are the details of your group."
                : "You are not assigned to a group yet."}
            </DialogDescription>
          </DialogHeader>

          {currentUser.judgingSession && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Mentor</p>
                <p className="text-sm font-medium">
                  {currentUser.judgingSession.mentorName}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Judges</p>
                <ul className="list-disc list-inside text-sm">
                  {currentUser.judgingSession.judges.length === 0 ? (
                    <li>No judges assigned.</li>
                  ) : (
                    currentUser.judgingSession.judges.map((judgeName) => (
                      <li key={judgeName}>{judgeName}</li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
