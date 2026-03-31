interface Props {
  authError: string | null
  signInWithGoogle: () => Promise<void>
}

export default function LoginPage({ authError, signInWithGoogle }: Props) {

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: '#ECEADE' }}
    >
      {/* Logo */}
      <div className="text-center mb-12">
        <h1
          className="font-serif text-6xl font-bold mb-2"
          style={{ color: '#2C2C2C' }}
        >
          Mente
        </h1>
        <p
          className="text-xs tracking-[0.25em] uppercase"
          style={{ color: '#8C8C7A' }}
        >
          Segundo Cerebro
        </p>
      </div>

      {/* Card de login */}
      <div
        className="rounded-2xl p-10 flex flex-col items-center gap-6"
        style={{ backgroundColor: '#F2EFE8', width: 360 }}
      >
        <p className="text-sm text-center" style={{ color: '#8C8C7A' }}>
          Captura, organiza y da vida a tus ideas
        </p>

        {authError && (
          <p className="text-xs text-center px-2" style={{ color: '#C0392B' }}>
            {authError}
          </p>
        )}

        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 w-full justify-center px-6 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
        >
          {/* Google Icon */}
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
            <path
              d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              fill="#FFC107"
            />
            <path
              d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              fill="#FF3D00"
            />
            <path
              d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
              fill="#4CAF50"
            />
            <path
              d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              fill="#1976D2"
            />
          </svg>
          Continuar con Google
        </button>
      </div>

      <p className="mt-8 text-xs" style={{ color: '#B0AD9F' }}>
        Tus datos son solo tuyos
      </p>
    </div>
  )
}
