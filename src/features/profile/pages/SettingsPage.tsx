import SecurityTab from '../components/SecurityTab'

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#0D1F3C]">
          Account security
        </h1>
        <p className="mt-1 text-sm text-[#6D7D90]">
          Manage sign-in protection and authenticators for your account.
        </p>
      </div>
      <SecurityTab />
    </div>
  )
}
