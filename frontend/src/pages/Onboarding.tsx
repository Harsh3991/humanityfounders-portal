import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import axiosInstance from '../lib/axiosInstance';

const formatFileName = (name: string) => {
  if (!name) return '';
  if (name.length <= 25) return name;

  const lastDotIndex = name.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return name.substring(0, 20) + '.....';
  }

  const ext = name.substring(lastDotIndex);
  const baseName = name.substring(0, lastDotIndex);

  return baseName.substring(0, 15) + '.....' + ext;
};

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');

  // Step 1 States
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitStep1 = async () => {
    setError('');
    if (!bankName || !accountNumber || !ifscCode || !aadhaarFile || !panFile) {
      setError('Please fill all fields and upload both documents.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('bankName', bankName);
      formData.append('accountNumber', accountNumber);
      formData.append('ifscCode', ifscCode);
      formData.append('aadhaarCard', aadhaarFile);
      formData.append('panCard', panFile);

      await axiosInstance.post('/onboarding/step1', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit step 1. Make sure you upload valid formats (PDF/Images) under 5MB.');
    } finally {
      setLoading(false);
    }
  };

  const submitStep2 = async () => {
    setError('');
    setLoading(true);
    try {
      await axiosInstance.post('/onboarding/step2', {
        declarationAccepted: agreed,
        digitalSignature: signature
      });
      completeOnboarding();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl text-primary italic mb-1">Welcome Aboard</h1>
          <p className="text-muted-foreground text-sm">Complete your profile to get started</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border ${step >= s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                }`}>
                {s}
              </div>
              <span className={`text-sm ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s === 1 ? 'Details' : 'Declaration'}
              </span>
              {s < 2 && <div className={`w-16 h-px ${step > 1 ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="border border-border bg-card p-8 rounded-lg">
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-heading text-xl text-foreground mb-4">Bank & Document Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Bank Name</Label>
                  <Input value={bankName} onChange={e => setBankName(e.target.value)} className="bg-secondary border-border" placeholder="e.g. State Bank of India" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Account Number</Label>
                  <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="bg-secondary border-border" placeholder="Account number" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">IFSC Code</Label>
                  <Input value={ifscCode} onChange={e => setIfscCode(e.target.value)} className="bg-secondary border-border" placeholder="IFSC code" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2 relative">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Upload Aadhaar</Label>
                  <div className={`border border-dashed rounded-lg p-6 text-center transition-colors relative ${aadhaarFile ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/jpg"
                      onChange={e => setAadhaarFile(e.target.files ? e.target.files[0] : null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <p className="text-sm text-foreground" title={aadhaarFile?.name}>{aadhaarFile ? formatFileName(aadhaarFile.name) : <span className="text-muted-foreground">Click to upload or drag & drop</span>}</p>
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Upload PAN</Label>
                  <div className={`border border-dashed rounded-lg p-6 text-center transition-colors relative ${panFile ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/jpg"
                      onChange={e => setPanFile(e.target.files ? e.target.files[0] : null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <p className="text-sm text-foreground" title={panFile?.name}>{panFile ? formatFileName(panFile.name) : <span className="text-muted-foreground">Click to upload or drag & drop</span>}</p>
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end pt-4">
                <Button onClick={submitStep1} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-sm">
                  {loading ? 'Submitting...' : 'Continue'}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h3 className="font-heading text-xl text-foreground mb-4">Declaration</h3>

              <div className="bg-secondary/50 border border-border rounded-lg p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  I hereby declare that all the information provided by me is true and accurate to the best of my knowledge.
                  I understand that any falsification of information may result in termination of employment.
                  I consent to the storage and processing of my personal data as per the company's privacy policy.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label htmlFor="agree" className="text-sm text-foreground cursor-pointer">
                  I Agree to the terms and conditions and have read the <a href="https://www.notion.so/ventures-hq/Welcome-Aboard-Folks-274ae870acf580bf987fd37c6e389c4c" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Onboarding Guide</a>.
                </label>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Digital Signature (type your full name)</Label>
                <Input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="bg-secondary border-border font-heading italic text-lg"
                  placeholder="Your full name"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => { setStep(1); setError(''); }} className="border-border text-foreground hover:bg-secondary uppercase tracking-widest text-sm">
                  Back
                </Button>
                <Button
                  onClick={submitStep2}
                  disabled={!agreed || !signature.trim() || loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-sm disabled:opacity-40"
                >
                  {loading ? 'Submitting...' : 'Complete'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
