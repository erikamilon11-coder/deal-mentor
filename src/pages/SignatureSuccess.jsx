import { CheckCircle } from "lucide-react";

export default function SignatureSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-xl">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Contract Signed!</h1>
        <p className="text-slate-600 mb-6">
          Thank you for signing the contract. Your signature has been recorded and the property owner
          has been notified.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800 font-medium">What happens next?</p>
          <p className="text-sm text-green-700 mt-2">
            You will receive a confirmation email shortly with a copy of the signed contract. 
            The closing process will begin as scheduled.
          </p>
        </div>
      </div>
    </div>
  );
}