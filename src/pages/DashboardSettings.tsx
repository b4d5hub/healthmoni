import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/lib/auth-context';
import { useDevice } from '@/lib/device-context';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Lock, Loader2, Save } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DashboardSettings() {
  const { user, updateProfile, changePassword } = useAuth();
  const { device, unpairDevice } = useDevice();
  const [name, setName] = useState(user?.name || '');
  const [sex, setSex] = useState<'male' | 'female'>(user?.sex || 'male');
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    user?.dateOfBirth ? new Date(user.dateOfBirth) : undefined
  );
  const [highHr, setHighHr] = useState('100');
  const [lowHr, setLowHr] = useState('50');
  const [feverThreshold, setFeverThreshold] = useState('38.0');
  const [emailNotif, setEmailNotif] = useState(true);

  // Loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [unpairLoading, setUnpairLoading] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = async () => {
    if (!dateOfBirth) {
      toast.error('Please select your date of birth');
      return;
    }
    setProfileLoading(true);
    try {
      await updateProfile({ name, sex, dateOfBirth: dateOfBirth.toISOString() });
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveThresholds = () => {
    toast.success('Thresholds saved');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUnpair = async () => {
    setUnpairLoading(true);
    try {
      await unpairDevice();
      toast.success('Device unpaired');
    } catch (err: any) {
      toast.error(err.message || 'Unpair failed');
    } finally {
      setUnpairLoading(false);
    }
  };

  const age = dateOfBirth ? differenceInYears(new Date(), dateOfBirth) : null;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Profile */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1.5" defaultValue={user?.email} disabled />
            </div>
          </div>

          <div className="mt-4">
            <Label>Sex</Label>
            <RadioGroup value={sex} onValueChange={(v) => setSex(v as 'male' | 'female')} className="mt-1.5 flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="settings-male" />
                <Label htmlFor="settings-male" className="font-normal cursor-pointer">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="settings-female" />
                <Label htmlFor="settings-female" className="font-normal cursor-pointer">Female</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="mt-4">
            <Label>Date of Birth {age !== null && <span className="text-muted-foreground font-normal">({age} years old)</span>}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "mt-1.5 w-full justify-start text-left font-normal",
                    !dateOfBirth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateOfBirth ? format(dateOfBirth, "PPP") : "Select your date of birth"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateOfBirth}
                  onSelect={setDateOfBirth}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                  captionLayout="dropdown-buttons"
                  fromYear={1920}
                  toYear={new Date().getFullYear()}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button className="mt-6 rounded-full" onClick={handleSaveProfile} disabled={profileLoading}>
            {profileLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Profile
          </Button>
        </div>

        {/* Change Password */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Change Password</h2>
          <div className="space-y-3">
            <div>
              <Label>Current Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" className="pl-10" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>New Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder="Min 8 characters" className="pl-10" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" className="pl-10" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </div>
          </div>
          <Button className="mt-6 rounded-full" onClick={handleChangePassword} disabled={passwordLoading}>
            {passwordLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Change Password
          </Button>
        </div>

        {/* Alert Thresholds */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Alert Thresholds</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>High HR (BPM)</Label>
              <Input className="mt-1.5 font-mono" type="number" value={highHr} onChange={e => setHighHr(e.target.value)} />
            </div>
            <div>
              <Label>Low HR (BPM)</Label>
              <Input className="mt-1.5 font-mono" type="number" value={lowHr} onChange={e => setLowHr(e.target.value)} />
            </div>
            <div>
              <Label>Fever (°C)</Label>
              <Input className="mt-1.5 font-mono" type="number" step="0.1" value={feverThreshold} onChange={e => setFeverThreshold(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4 rounded-full" onClick={handleSaveThresholds}>Save Thresholds</Button>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Notifications</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Email notifications</p>
              <p className="text-xs text-muted-foreground">Receive alerts via email when thresholds are crossed</p>
            </div>
            <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
          </div>
        </div>

        {/* Device */}
        {device && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Connected Device</h2>
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Serial Number</span>
              <span className="font-mono font-medium text-foreground">{device.serialNumber}</span>
            </div>
            <Separator className="mb-4" />
            <Button variant="destructive" size="sm" className="rounded-full" onClick={handleUnpair} disabled={unpairLoading}>
              {unpairLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Unpair Device
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
