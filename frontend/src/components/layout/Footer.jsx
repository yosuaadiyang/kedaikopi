export default function Footer() {
  return (
    <footer className="bg-coffee-950 border-t border-coffee-800/50 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src="/logo.png" alt="KedaiKopi" className="h-6 w-auto opacity-70" />
        </div>
        <p className="text-coffee-500 text-sm">
          &copy; {new Date().getFullYear()} KedaiKopi. Platform direktori kedai kopi Indonesia.
        </p>
        <p className="text-coffee-600 text-xs mt-2">
          kedaikopi.id
        </p>
      </div>
    </footer>
  );
}
