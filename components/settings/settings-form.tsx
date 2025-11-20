"use client"

import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
import { useAmountVisibility } from "@/components/amount-visibility"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LogOut, Moon, Sun, Laptop } from "lucide-react"

export function SettingsForm() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showAmounts, toggle } = useAmountVisibility()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how TOLVA looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Theme</Label>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming Soon</span>
            </div>
            <div className="grid grid-cols-3 gap-4 opacity-50">
              <Button
                variant="outline"
                disabled
                className="justify-start gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant="outline"
                disabled
                className="justify-start gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant="outline"
                disabled
                className="justify-start gap-2"
              >
                <Laptop className="h-4 w-4" />
                System
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Theme customization will be available in a future update.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Manage how your financial data is displayed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Show amounts by default</Label>
              <p className="text-sm text-muted-foreground">
                If disabled, amounts will be hidden (****) until you toggle them.
              </p>
            </div>
            <Switch
              checked={showAmounts}
              onCheckedChange={toggle}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your account settings and session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <div className="flex h-10 w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {user?.email}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="destructive"
            className="w-full sm:w-auto gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
