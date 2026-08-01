import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function Unsubscribe() {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const token = params.get('token');

    if (!email || !token) {
      setStatus('error');
      setMessage('This unsubscribe link is missing information. Please use the link exactly as it appeared in the email.');
      return;
    }

    fetch(`${SUPABASE_URL}/functions/v1/unsubscribe-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ email, token }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to unsubscribe.');
        setStatus('done');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Something went wrong. Please try again later.');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FBF8F3' }}>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-10 text-center">
        <img src="/Voice_Of_Preemies_Logo.png" alt="Voice of Preemies" className="h-10 w-auto mx-auto mb-6" />

        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-[#0A6070] mx-auto mb-4 animate-spin" />
            <p className="text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Processing your request…</p>
          </>
        )}

        {status === 'done' && (
          <>
            <CheckCircle className="w-12 h-12 text-[#2D8A5F] mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>You're unsubscribed</h1>
            <p className="text-[#5A7280] text-sm leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              You won't receive any more publication updates from us. If you change your mind, you're always welcome to reach out.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-[#E8644A] mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Couldn't process that</h1>
            <p className="text-[#5A7280] text-sm leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{message}</p>
          </>
        )}

        <Link to="/" className="inline-block mt-6 text-sm font-semibold text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Return to homepage
        </Link>
      </div>
    </div>
  );
}
