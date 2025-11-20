import { SettingsForm } from "@/components/settings/settings-form"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">System</p>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Settings
          </h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Manage your preferences, appearance, and account settings.
        </p>
      </div>

      <div className="max-w-2xl">
        <SettingsForm />
      </div>
    </div>
  )
}
