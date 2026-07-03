import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { Loader2, ShieldCheck } from 'lucide-react';

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign-in error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed before completion. Please try again.');
      } else {
        setError('Failed to sign in. Please verify your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at 10% 20%, rgb(239, 246, 255) 0%, rgb(219, 234, 254) 100%)',
      padding: '1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        {/* Decorative Icon */}
        <div style={{
          background: 'rgba(79, 70, 229, 0.1)',
          color: 'var(--primary, #4f46e5)',
          padding: '1rem',
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.5rem',
          boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.2)'
        }}>
          <ShieldCheck size={36} />
        </div>

        {/* Title & Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{
            fontSize: '1.65rem',
            fontWeight: '800',
            color: '#1e293b',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Reimbursement Portal
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: '#64748b',
            lineHeight: '1.5',
            margin: 0,
            padding: '0 0.5rem'
          }}>
            Sign in to submit your business trip claims and track reimbursement approvals in real-time.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            width: '100%',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#ef4444',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            fontSize: '0.825rem',
            fontWeight: '500',
            textAlign: 'left',
            lineHeight: '1.4'
          }}>
            {error}
          </div>
        )}

        {/* Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.8rem 1rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
            }
          }}
        >
          {loading ? (
            <Loader2 className="scanner-spinner" size={20} style={{ color: '#4f46e5' }} />
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" style={{ display: 'block' }}>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        {/* Footer */}
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Secure connection authorized by Google Firebase
        </span>
      </div>
    </div>
  );
}

export default LoginPage;
